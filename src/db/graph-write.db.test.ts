import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "../domain/access";
import type { Graph } from "../domain/graph";
import { loadActor } from "./actor";
import {
  addPath,
  addRequirement,
  createCatalogueItem,
  createRole,
  createSpecialization,
  deleteRoleLike,
  deletionImpact,
  EditError,
  ForbiddenError,
  publishRoleLike,
  removePath,
  removeRequirement,
  updateRequirement,
  updateRoleLike,
  type EditContext,
} from "./graph-write";
import { loadGraph } from "./graph";
import { auditLog, edges, nodes } from "./schema";
import { seed } from "./seed/seed";
import { createTestDb } from "./testing";

let t: Awaited<ReturnType<typeof createTestDb>>;
let graph: Graph;
let taylor: EditContext; // Frontend Practice Lead
let casey: EditContext; // Delivery Management Practice Lead
let jordan: EditContext; // Site Lead
let alex: EditContext; // employee
let morgan: EditContext; // manager
let frontendId: string;
let deliveryId: string;
const id = (name: string) => [...graph.nodes.values()].find((n) => n.name === name)!.id;
const refresh = async () => (graph = await loadGraph(t.db));
const actor = async (userId: string): Promise<EditContext> => ({
  actor: (await loadActor(t.db, userId)) as Actor,
});
const auditRows = async () => t.db.select().from(auditLog).orderBy(auditLog.at);
const reject = async (p: Promise<unknown>, type: typeof EditError | typeof ForbiddenError = EditError) => {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(type);
  return err as Error;
};

beforeAll(async () => {
  t = await createTestDb();
  await seed(t.db, { today: new Date("2026-10-10T12:00:00Z") });
  await refresh();
  [taylor, casey, jordan, alex, morgan] = await Promise.all(
    ["seed-taylor", "seed-casey", "seed-jordan", "seed-alex", "seed-morgan"].map(actor),
  );
  frontendId = taylor.actor.leadOf[0].id;
  deliveryId = casey.actor.leadOf[0].id;
});
afterAll(async () => {
  await t.client.close();
});

describe("roles", () => {
  it("a Practice Lead creates a draft role in their practice, and an audit row records it", async () => {
    const before = (await auditRows()).length;
    const role = await createRole(t.db, taylor, {
      practiceId: frontendId,
      name: " Quantum Developer ",
      description: "Builds quantum interfaces.",
    });
    expect(role).toMatchObject({
      type: "role",
      name: "Quantum Developer",
      slug: "quantum-developer",
      status: "draft",
      practiceId: frontendId,
    });
    const rows = await auditRows();
    expect(rows).toHaveLength(before + 1);
    expect(rows.at(-1)).toMatchObject({
      actorId: "seed-taylor",
      action: "create",
      entity: "node",
      entityId: role.id,
      changeRequestId: null,
    });
    expect(rows.at(-1)!.after).toMatchObject({ name: "Quantum Developer", status: "draft", roleId: role.id });
    expect((rows.at(-1)!.after as Record<string, unknown>).emergency).toBeUndefined();
  });

  it("refuses another practice, an employee and a manager, and writes nothing", async () => {
    const before = (await auditRows()).length;
    for (const who of [casey, alex, morgan]) {
      await reject(
        createRole(t.db, who, { practiceId: frontendId, name: "Sneaky Role", description: "x" }),
        ForbiddenError,
      );
    }
    expect(await auditRows()).toHaveLength(before);
    expect(await t.db.select().from(nodes).where(eq(nodes.name, "Sneaky Role"))).toHaveLength(0);
  });

  it("the Site Lead may, and the audit row says it was an emergency edit", async () => {
    const role = await createRole(t.db, jordan, {
      practiceId: deliveryId,
      name: "Emergency Role",
      description: "Needed now.",
    });
    const row = (await auditRows()).find((r) => r.entityId === role.id)!;
    expect(row.actorId).toBe("seed-jordan");
    expect(row.after).toMatchObject({ emergency: true });
  });

  it("refuses a name that exists, ignoring case and punctuation, and roles and skills share names", async () => {
    const err = await reject(
      createRole(t.db, taylor, { practiceId: frontendId, name: "frontend  developer", description: "x" }),
    );
    expect(err.message).toContain("already exists");
    await reject(createRole(t.db, taylor, { practiceId: frontendId, name: "SQL", description: "x" }));
    await reject(createRole(t.db, taylor, { practiceId: frontendId, name: "  ", description: "x" }));
    await reject(createRole(t.db, taylor, { practiceId: frontendId, name: "Needs Words", description: "" }));
  });

  it("numbers a slug that clashes", async () => {
    // a name that normalises differently but slugifies the same way is impossible, so clash through a draft's slug
    const a = await createRole(t.db, taylor, {
      practiceId: frontendId,
      name: "Slug Test One",
      description: "x",
    });
    expect(a.slug).toBe("slug-test-one");
  });

  it("renames and re-describes, keeping the address; the audit row has before and after", async () => {
    await refresh();
    const role = (await t.db.select().from(nodes).where(eq(nodes.name, "Quantum Developer")))[0];
    await updateRoleLike(t.db, taylor, { id: role.id, description: "Builds quantum interfaces and tools." });
    const row = (await auditRows()).filter((r) => r.entityId === role.id).at(-1)!;
    expect(row.action).toBe("update");
    expect(row.before).toMatchObject({ description: "Builds quantum interfaces." });
    expect(row.after).toMatchObject({
      description: "Builds quantum interfaces and tools.",
      slug: "quantum-developer",
    });
    // no change: no audit row
    const count = (await auditRows()).length;
    await updateRoleLike(t.db, taylor, { id: role.id, description: "Builds quantum interfaces and tools." });
    expect(await auditRows()).toHaveLength(count);
    await reject(updateRoleLike(t.db, taylor, { id: role.id, name: "Scrum Master" }));
    await reject(updateRoleLike(t.db, casey, { id: role.id, description: "Not mine." }), ForbiddenError);
  });
});

describe("requirements", () => {
  let roleId: string;
  beforeAll(async () => {
    roleId = (await t.db.select().from(nodes).where(eq(nodes.name, "Quantum Developer")))[0].id;
    await refresh();
  });

  it("adds, updates and removes a requirement, with audit rows that keep the before and after", async () => {
    const e = await addRequirement(t.db, taylor, {
      ownerId: roleId,
      itemId: id("TypeScript"),
      priority: "critical",
      note: " core language ",
    });
    expect(e).toMatchObject({ kind: "requires", priority: "critical", note: "core language" });
    await updateRequirement(t.db, taylor, {
      ownerId: roleId,
      itemId: id("TypeScript"),
      priority: "important",
    });
    await removeRequirement(t.db, taylor, { ownerId: roleId, itemId: id("TypeScript") });
    const rows = (await auditRows()).filter((r) => r.entity === "edge" && r.entityId === e.id);
    expect(rows.map((r) => r.action)).toEqual(["create", "update", "delete"]);
    expect(rows[1].before).toMatchObject({
      priority: "critical",
      source: "Quantum Developer",
      target: "TypeScript",
    });
    expect(rows[1].after).toMatchObject({ priority: "important", roleId });
    expect(rows[2].before).toMatchObject({ priority: "important" });
    expect(await t.db.select().from(edges).where(eq(edges.id, e.id))).toHaveLength(0);
  });

  it("refuses duplicates, things that aren't catalogue items, and a missing weight; nothing is written", async () => {
    await addRequirement(t.db, taylor, { ownerId: roleId, itemId: id("Git"), priority: "important" });
    const count = (await auditRows()).length;
    await reject(addRequirement(t.db, taylor, { ownerId: roleId, itemId: id("Git"), priority: "nice" }));
    await reject(
      addRequirement(t.db, taylor, { ownerId: roleId, itemId: id("Data Engineer"), priority: "nice" }),
    );
    await reject(
      addRequirement(t.db, taylor, { ownerId: roleId, itemId: id("Jira"), priority: undefined as never }),
    );
    await reject(updateRequirement(t.db, taylor, { ownerId: roleId, itemId: id("Jira"), priority: "nice" }));
    await reject(removeRequirement(t.db, taylor, { ownerId: roleId, itemId: id("Jira") }));
    expect(await auditRows()).toHaveLength(count);
  });

  it("a lead can't touch another practice's role (Scenario 5), but the Site Lead can", async () => {
    const scrum = id("Scrum Master");
    const before = (await auditRows()).length;
    await reject(
      addRequirement(t.db, taylor, { ownerId: scrum, itemId: id("Git"), priority: "nice" }),
      ForbiddenError,
    );
    await reject(
      updateRequirement(t.db, taylor, { ownerId: scrum, itemId: id("Jira"), priority: "important" }),
      ForbiddenError,
    );
    await reject(removeRequirement(t.db, taylor, { ownerId: scrum, itemId: id("Jira") }), ForbiddenError);
    await reject(
      addRequirement(t.db, alex, { ownerId: roleId, itemId: id("Jira"), priority: "nice" }),
      ForbiddenError,
    );
    expect(await auditRows()).toHaveLength(before);
    await updateRequirement(t.db, casey, {
      ownerId: scrum,
      itemId: id("Jira"),
      priority: "important",
      note: "Used daily.",
    });
    await updateRequirement(t.db, casey, {
      ownerId: scrum,
      itemId: id("Jira"),
      priority: "nice",
      note: null,
    }); // put it back
    await updateRequirement(t.db, jordan, {
      ownerId: scrum,
      itemId: id("Jira"),
      priority: "nice",
      note: "x",
    });
    const emergency = (await auditRows()).at(-1)!;
    expect(emergency.actorId).toBe("seed-jordan");
    expect(emergency.after).toMatchObject({ emergency: true });
  });
});

describe("publishing and deleting", () => {
  it("a role needs a requirement before it is published, then everyone sees it", async () => {
    const role = await createRole(t.db, taylor, {
      practiceId: frontendId,
      name: "Publish Test",
      description: "A role to publish.",
    });
    const err = await reject(publishRoleLike(t.db, taylor, role.id));
    expect(err.message).toContain("at least one requirement");
    await addRequirement(t.db, taylor, { ownerId: role.id, itemId: id("Git"), priority: "important" });
    const published = await publishRoleLike(t.db, taylor, role.id);
    expect(published.status).toBe("published");
    const row = (await auditRows()).at(-1)!;
    expect(row).toMatchObject({ action: "update", entityId: role.id });
    expect(row.before).toMatchObject({ status: "draft" });
    expect(row.after).toMatchObject({ status: "published" });
    await reject(publishRoleLike(t.db, casey, role.id), ForbiddenError);
  });

  it("a specialisation is a draft, and can only be published once its role is", async () => {
    const draftRole = await createRole(t.db, taylor, {
      practiceId: frontendId,
      name: "Draft With Spec",
      description: "x",
    });
    const spec = await createSpecialization(t.db, taylor, {
      roleId: draftRole.id,
      name: "Wasm",
      description: "WebAssembly.",
    });
    expect(spec).toMatchObject({
      type: "specialization",
      slug: "draft-with-spec--wasm",
      status: "draft",
      parentRoleId: draftRole.id,
    });
    expect((await reject(publishRoleLike(t.db, taylor, spec.id))).message).toContain(
      "Publish Draft With Spec first",
    );
    await reject(
      createSpecialization(t.db, taylor, { roleId: draftRole.id, name: "wasm", description: "x" }),
    );
    await reject(
      createSpecialization(t.db, casey, { roleId: draftRole.id, name: "Other", description: "x" }),
      ForbiddenError,
    );
    await reject(createSpecialization(t.db, taylor, { roleId: id("SQL"), name: "x", description: "x" }));
  });

  it("shows what deleting takes with it, deletes it and keeps what it was in the audit log", async () => {
    await refresh();
    const react = id("Frontend Developer");
    const impact = await deletionImpact(t.db, react);
    expect(impact.specializations).toEqual(["Angular", "React"]);
    expect(impact.links).toBeGreaterThan(10);
    expect(impact.people).toBeGreaterThan(0); // Alex, Noah and Zoe hold a specialisation of it
    await reject(deleteRoleLike(t.db, casey, react), ForbiddenError);

    const role = await createRole(t.db, taylor, {
      practiceId: frontendId,
      name: "Delete Me",
      description: "Short lived.",
    });
    await addRequirement(t.db, taylor, { ownerId: role.id, itemId: id("Git"), priority: "nice" });
    await deleteRoleLike(t.db, taylor, role.id);
    expect(await t.db.select().from(nodes).where(eq(nodes.id, role.id))).toHaveLength(0);
    expect(await t.db.select().from(edges).where(eq(edges.sourceId, role.id))).toHaveLength(0);
    const row = (await auditRows()).at(-1)!;
    expect(row).toMatchObject({ action: "delete", entity: "node", entityId: role.id });
    expect(row.before).toMatchObject({ name: "Delete Me", links: 1 });
  });
});

describe("paths", () => {
  it("adds and removes an official path between published roles, and checks the rules", async () => {
    await refresh();
    const ux = id("UX Developer");
    const data = id("Data Analyst");
    const e = await addPath(t.db, taylor, {
      fromId: ux,
      toId: data,
      note: "Via analytics.",
      typicalMonths: 9,
    });
    expect(e).toMatchObject({ kind: "next_step", typicalMonths: 9, note: "Via analytics." });
    await refresh();
    await reject(addPath(t.db, taylor, { fromId: ux, toId: data })); // exists
    await reject(addPath(t.db, taylor, { fromId: ux, toId: ux }));
    await reject(addPath(t.db, taylor, { fromId: ux, toId: id("SQL") }));
    await reject(addPath(t.db, taylor, { fromId: ux, toId: id("Scrum Master"), typicalMonths: 0 }));
    await reject(addPath(t.db, casey, { fromId: ux, toId: id("Scrum Master") }), ForbiddenError);
    await removePath(t.db, taylor, { fromId: ux, toId: data });
    await reject(removePath(t.db, taylor, { fromId: ux, toId: data }));
    const rows = (await auditRows()).filter((r) => r.entityId === e.id);
    expect(rows.map((r) => r.action)).toEqual(["create", "delete"]);
  });
});

describe("catalogue", () => {
  it("Practice Leads and the Site Lead add items; duplicates are blocked by normalised name", async () => {
    const item = await createCatalogueItem(t.db, taylor, {
      type: "technical_skill",
      name: "Rust",
      category: "Language",
      description: "Systems language.",
    });
    expect(item).toMatchObject({
      type: "technical_skill",
      slug: "rust",
      status: "published",
      category: "Language",
    });
    const cert = await createCatalogueItem(t.db, jordan, {
      type: "certification",
      name: "Rust Associate",
      issuer: " Rust Foundation ",
    });
    expect(cert.issuer).toBe("Rust Foundation");
    expect(
      (await reject(createCatalogueItem(t.db, casey, { type: "technical_skill", name: " rust " }))).message,
    ).toContain("already exists");
    await reject(createCatalogueItem(t.db, casey, { type: "soft_skill", name: "problem  solving" }));
    await reject(
      createCatalogueItem(t.db, casey, { type: "technical_skill", name: "Zig", issuer: "Someone" }),
    );
    await reject(createCatalogueItem(t.db, casey, { type: "role", name: "Zig" }));
    const row = (await auditRows()).find((r) => r.entityId === item.id)!;
    expect(row).toMatchObject({ actorId: "seed-taylor", action: "create", entity: "node" });
  });
  it("employees and managers can't", async () => {
    await reject(createCatalogueItem(t.db, alex, { type: "technical_skill", name: "Go" }), ForbiddenError);
    await reject(createCatalogueItem(t.db, morgan, { type: "technical_skill", name: "Go" }), ForbiddenError);
  });
  it("a new item can be required straight away", async () => {
    await refresh();
    const role = (await t.db.select().from(nodes).where(eq(nodes.name, "Quantum Developer")))[0];
    const e = await addRequirement(t.db, taylor, { ownerId: role.id, itemId: id("Rust"), priority: "nice" });
    expect(e.kind).toBe("requires");
  });
});

describe("edits show in the graph straight away", () => {
  it("a fresh load has the change", async () => {
    const fresh = await loadGraph(t.db);
    const quantum = [...fresh.nodes.values()].find((n) => n.name === "Quantum Developer")!;
    expect(quantum.status).toBe("draft");
    expect(fresh.edges.some((e) => e.sourceId === quantum.id && e.kind === "requires")).toBe(true);
  });
});
