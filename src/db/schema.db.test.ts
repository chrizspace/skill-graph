import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./testing";
import { edges, nodes, profiles, user } from "./schema";

let t: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(async () => {
  await t.client.close();
});
beforeEach(async () => {
  await t.client.exec('truncate nodes, edges, "user", profiles, profile_skills, audit_log cascade');
});

async function node(name: string, type: "role" | "skill" | "technology" = "skill") {
  const slug = name.toLowerCase().replace(/[^a-z0-9+#]+/g, "-");
  const [row] = await t.db
    .insert(nodes)
    .values({ type, name, slug, normalizedName: name.toLowerCase() })
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
  it("rejects a duplicate normalised name, even across types", async () => {
    await node("Python", "skill");
    const message = await rejection(
      t.db
        .insert(nodes)
        .values({ type: "technology", name: "python", slug: "python-2", normalizedName: "python" }),
    );
    expect(message).toMatch(/nodes_normalized_name_unique/);
  });

  it("allows many manual nodes without an external id but not two with the same one per source", async () => {
    await node("SQL");
    await node("Git", "technology");
    await t.db
      .insert(nodes)
      .values({ type: "skill", name: "A", slug: "a", normalizedName: "a", source: "hr", externalId: "1" });
    const message = await rejection(
      t.db
        .insert(nodes)
        .values({ type: "skill", name: "B", slug: "b", normalizedName: "b", source: "hr", externalId: "1" }),
    );
    expect(message).toMatch(/nodes_source_external_id_unique/);
  });
});

describe("edges", () => {
  it("rejects a node linked to itself", async () => {
    const sql = await node("SQL");
    const message = await rejection(
      t.db.insert(edges).values({ kind: "builds_on", sourceId: sql.id, targetId: sql.id }),
    );
    expect(message).toMatch(/edges_no_self_loop/);
  });

  it("requires a priority on requires and forbids it elsewhere", async () => {
    const role = await node("Data Engineer", "role");
    const sql = await node("SQL");
    const python = await node("Python");
    expect(
      await rejection(t.db.insert(edges).values({ kind: "requires", sourceId: role.id, targetId: sql.id })),
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
      .values({ kind: "requires", sourceId: role.id, targetId: sql.id, priority: "critical" });
  });

  it("keeps strength between 1 and 5", async () => {
    const a = await node("Spark", "technology");
    const b = await node("Python");
    expect(
      await rejection(
        t.db.insert(edges).values({ kind: "builds_on", sourceId: a.id, targetId: b.id, strength: 6 }),
      ),
    ).toMatch(/edges_strength_range/);
  });

  it("stores related_to once, with the smaller id first", async () => {
    const a = await node("Terraform", "technology");
    const b = await node("Bicep", "technology");
    const [low, high] = [a.id, b.id].sort();
    expect(
      await rejection(t.db.insert(edges).values({ kind: "related_to", sourceId: high, targetId: low })),
    ).toMatch(/edges_related_to_ordered/);
    await t.db.insert(edges).values({ kind: "related_to", sourceId: low, targetId: high });
  });

  it("rejects the same link twice and deletes links with their node", async () => {
    const role = await node("Frontend Developer", "role");
    const react = await node("React", "technology");
    await t.db
      .insert(edges)
      .values({ kind: "requires", sourceId: role.id, targetId: react.id, priority: "critical" });
    expect(
      await rejection(
        t.db
          .insert(edges)
          .values({ kind: "requires", sourceId: role.id, targetId: react.id, priority: "nice" }),
      ),
    ).toMatch(/edges_kind_source_target_unique/);

    await t.client.query("delete from nodes where id = $1", [react.id]);
    expect(await t.db.select().from(edges)).toHaveLength(0);
  });
});

describe("profiles", () => {
  it("can't be their own manager, and keep the person when their role node is deleted", async () => {
    const role = await node("Project Manager", "role");
    await t.db.insert(user).values({ id: "u1", name: "Test User", email: "test@example.com" });
    expect(
      await rejection(
        t.db.insert(profiles).values({ userId: "u1", managerId: "u1", currentRoleId: role.id }),
      ),
    ).toMatch(/profiles_not_own_manager/);

    await t.db.insert(profiles).values({ userId: "u1", currentRoleId: role.id });
    await t.client.query("delete from nodes where id = $1", [role.id]);
    const [profile] = await t.db.select().from(profiles);
    expect(profile).toMatchObject({ userId: "u1", appRole: "employee", currentRoleId: null });
  });
});
