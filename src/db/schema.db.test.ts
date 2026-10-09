import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./testing";
import { edges, nodes, practices, profileItems, profiles, recommendations, sites, user } from "./schema";

let t: Awaited<ReturnType<typeof createTestDb>>;
let practiceId: string;
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(async () => {
  await t.client.close();
});
beforeEach(async () => {
  await t.client.exec(
    'truncate sites, practices, nodes, edges, "user", profiles, profile_items, recommendations, change_requests, audit_log cascade',
  );
  const [site] = await t.db.insert(sites).values({ name: "Test", slug: "test" }).returning();
  [{ id: practiceId }] = await t.db
    .insert(practices)
    .values({ siteId: site.id, name: "P", slug: "p" })
    .returning();
});

type CatalogueType = "technical_skill" | "soft_skill" | "certification";
async function item(name: string, type: CatalogueType = "technical_skill") {
  const [row] = await t.db
    .insert(nodes)
    .values({
      type,
      name,
      slug: name.toLowerCase(),
      normalizedName: name.toLowerCase(),
      issuer: type === "certification" ? "X" : null,
    })
    .returning();
  return row;
}
async function role(name: string) {
  const [row] = await t.db
    .insert(nodes)
    .values({
      type: "role",
      name,
      slug: name.toLowerCase().replace(/ /g, "-"),
      normalizedName: name.toLowerCase(),
      practiceId,
    })
    .returning();
  return row;
}
async function specialization(parentRoleId: string, name: string, slug: string) {
  const [row] = await t.db
    .insert(nodes)
    .values({ type: "specialization", name, slug, normalizedName: name.toLowerCase(), parentRoleId })
    .returning();
  return row;
}

// drizzle wraps driver errors; the Postgres message is on the cause
async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (e: Error & { cause?: Error }) => e,
  );
  expect(error, "expected the database to reject this").not.toBeNull();
  return String(error?.cause?.message ?? error?.message);
}

describe("nodes", () => {
  it("rejects a duplicate normalised name across roles and catalogue types", async () => {
    await item("Python");
    expect(
      await rejection(
        t.db
          .insert(nodes)
          .values({ type: "soft_skill", name: "python", slug: "python-2", normalizedName: "python" }),
      ),
    ).toMatch(/nodes_normalized_name_unique/);
  });

  it("lets a specialisation share a catalogue item's name, but only once per role", async () => {
    await item("React");
    const frontend = await role("Frontend Developer");
    const other = await role("Full-stack Developer");
    await specialization(frontend.id, "React", "frontend-developer--react");
    await specialization(other.id, "React", "full-stack-developer--react");
    expect(await rejection(specialization(frontend.id, "react", "frontend-developer--react-2"))).toMatch(
      /nodes_specialization_name_unique/,
    );
  });

  it("requires a practice for roles and a parent role for specialisations, and nothing else", async () => {
    expect(
      await rejection(t.db.insert(nodes).values({ type: "role", name: "R", slug: "r", normalizedName: "r" })),
    ).toMatch(/nodes_role_has_practice/);
    expect(
      await rejection(
        t.db.insert(nodes).values({ type: "specialization", name: "S", slug: "s", normalizedName: "s" }),
      ),
    ).toMatch(/nodes_specialization_has_role/);
    expect(
      await rejection(
        t.db
          .insert(nodes)
          .values({ type: "technical_skill", name: "T", slug: "t", normalizedName: "t", practiceId }),
      ),
    ).toMatch(/nodes_role_has_practice/);
  });

  it("allows an issuer only on certifications", async () => {
    await item("PSM I", "certification");
    expect(
      await rejection(
        t.db
          .insert(nodes)
          .values({ type: "soft_skill", name: "C", slug: "c", normalizedName: "c", issuer: "Someone" }),
      ),
    ).toMatch(/nodes_issuer_only_on_certifications/);
  });

  it("deletes a role's specialisations and their links with the role", async () => {
    const frontend = await role("Frontend Developer");
    const react = await specialization(frontend.id, "React", "frontend-developer--react");
    const lib = await item("React library");
    await t.db
      .insert(edges)
      .values({ kind: "requires", sourceId: react.id, targetId: lib.id, priority: "critical" });
    await t.client.query("delete from nodes where id = $1", [frontend.id]);
    expect((await t.db.select().from(nodes)).map((n) => n.name)).toEqual(["React library"]);
    expect(await t.db.select().from(edges)).toHaveLength(0);
  });
});

describe("edges", () => {
  it("rejects a node linked to itself", async () => {
    const sql = await item("SQL");
    expect(
      await rejection(t.db.insert(edges).values({ kind: "builds_on", sourceId: sql.id, targetId: sql.id })),
    ).toMatch(/edges_no_self_loop/);
  });

  it("requires a weight on requires and forbids it elsewhere", async () => {
    const engineer = await role("Data Engineer");
    const sql = await item("SQL");
    const python = await item("Python");
    expect(
      await rejection(
        t.db.insert(edges).values({ kind: "requires", sourceId: engineer.id, targetId: sql.id }),
      ),
    ).toMatch(/edges_priority_only_on_requires/);
    expect(
      await rejection(
        t.db
          .insert(edges)
          .values({ kind: "builds_on", sourceId: python.id, targetId: sql.id, priority: "critical" }),
      ),
    ).toMatch(/edges_priority_only_on_requires/);
    await t.db
      .insert(edges)
      .values({ kind: "requires", sourceId: engineer.id, targetId: sql.id, priority: "critical" });
  });

  it("keeps strength between 1 and 5 and typical months on official paths only", async () => {
    const a = await item("Spark");
    const b = await item("Python");
    expect(
      await rejection(
        t.db.insert(edges).values({ kind: "builds_on", sourceId: a.id, targetId: b.id, strength: 6 }),
      ),
    ).toMatch(/edges_strength_range/);
    expect(
      await rejection(
        t.db.insert(edges).values({ kind: "builds_on", sourceId: a.id, targetId: b.id, typicalMonths: 6 }),
      ),
    ).toMatch(/edges_typical_months_only_on_paths/);
    const from = await role("Project Manager");
    const to = await role("Delivery Manager");
    await t.db
      .insert(edges)
      .values({ kind: "next_step", sourceId: from.id, targetId: to.id, typicalMonths: 24 });
  });

  it("stores related_to once, with the smaller id first", async () => {
    const a = await item("Terraform");
    const b = await item("Bicep");
    const [low, high] = [a.id, b.id].sort();
    expect(
      await rejection(t.db.insert(edges).values({ kind: "related_to", sourceId: high, targetId: low })),
    ).toMatch(/edges_related_to_ordered/);
    await t.db.insert(edges).values({ kind: "related_to", sourceId: low, targetId: high });
  });

  it("rejects the same link twice", async () => {
    const frontend = await role("Frontend Developer");
    const css = await item("HTML & CSS");
    await t.db
      .insert(edges)
      .values({ kind: "requires", sourceId: frontend.id, targetId: css.id, priority: "critical" });
    expect(
      await rejection(
        t.db
          .insert(edges)
          .values({ kind: "requires", sourceId: frontend.id, targetId: css.id, priority: "nice" }),
      ),
    ).toMatch(/edges_kind_source_target_unique/);
  });
});

describe("people", () => {
  beforeEach(async () => {
    await t.db.insert(user).values([
      { id: "u1", name: "One", email: "one@example.com" },
      { id: "u2", name: "Two", email: "two@example.com" },
    ]);
  });

  it("can't be their own manager, or have a specialisation without a role", async () => {
    expect(await rejection(t.db.insert(profiles).values({ userId: "u1", managerId: "u1" }))).toMatch(
      /profiles_not_own_manager/,
    );
    const frontend = await role("Frontend Developer");
    const react = await specialization(frontend.id, "React", "frontend-developer--react");
    expect(
      await rejection(t.db.insert(profiles).values({ userId: "u1", currentSpecializationId: react.id })),
    ).toMatch(/profiles_current_specialization_needs_role/);
    expect(
      await rejection(t.db.insert(profiles).values({ userId: "u1", targetSpecializationId: react.id })),
    ).toMatch(/profiles_target_specialization_needs_role/);
  });

  it("keeps the person when their role is deleted", async () => {
    const pm = await role("Project Manager");
    await t.db.insert(profiles).values({ userId: "u1", practiceId, currentRoleId: pm.id, managerId: "u2" });
    await t.client.query("delete from nodes where id = $1", [pm.id]);
    const [profile] = await t.db.select().from(profiles);
    expect(profile).toMatchObject({ userId: "u1", practiceId, currentRoleId: null, managerId: "u2" });
  });

  it("rejects a certification that expires before it was obtained", async () => {
    const cert = await item("PSM I", "certification");
    expect(
      await rejection(
        t.db
          .insert(profileItems)
          .values({ userId: "u1", nodeId: cert.id, obtainedOn: "2026-05-01", expiresOn: "2026-04-01" }),
      ),
    ).toMatch(/profile_items_expiry_after_obtained/);
    await t.db
      .insert(profileItems)
      .values({ userId: "u1", nodeId: cert.id, obtainedOn: "2026-05-01", expiresOn: null });
  });

  it("doesn't let anyone recommend something to themselves", async () => {
    const sql = await item("SQL");
    expect(
      await rejection(
        t.db.insert(recommendations).values({ personId: "u1", authorId: "u1", nodeId: sql.id }),
      ),
    ).toMatch(/recommendations_not_to_self/);
    await t.db.insert(recommendations).values({ personId: "u1", authorId: "u2", nodeId: sql.id });
  });
});
