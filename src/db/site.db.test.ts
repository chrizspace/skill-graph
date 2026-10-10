import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "../domain/access";
import type { Graph } from "../domain/graph";
import { loadActor } from "./actor";
import { loadGraph } from "./graph";
import { createRole, EditError, ForbiddenError } from "./graph-write";
import {
  addSiteLead,
  appointLead,
  auditPage,
  createPractice,
  listCategories,
  listPeople,
  mergeImpact,
  mergeItems,
  removeLead,
  removeSiteLead,
  renameCategory,
  setItemCategory,
  setPersonManager,
  setPersonPractice,
  updatePractice,
  type SiteContext,
} from "./site";
import {
  auditLog,
  edges,
  nodes,
  practiceLeads,
  practices,
  profileItems,
  recommendations,
  user,
} from "./schema";
import { seed } from "./seed/seed";
import { createTestDb } from "./testing";

let t: Awaited<ReturnType<typeof createTestDb>>;
let graph: Graph;
let jordan: SiteContext;
let taylor: SiteContext;
let alex: SiteContext;
const id = (name: string) =>
  [...graph.nodes.values()].find((n) => n.name === name && n.type !== "specialization")!.id;
const refresh = async () => (graph = await loadGraph(t.db));
const ctx = async (userId: string): Promise<SiteContext> => ({
  actor: (await loadActor(t.db, userId)) as Actor,
});
const reject = async (p: Promise<unknown>, type: typeof EditError | typeof ForbiddenError = EditError) => {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(type);
  return err as Error;
};
const lastAudit = async () => (await t.db.select().from(auditLog).orderBy(auditLog.at)).at(-1)!;

beforeAll(async () => {
  t = await createTestDb();
  await seed(t.db, { today: new Date("2026-10-10T12:00:00Z") });
  await refresh();
  [jordan, taylor, alex] = await Promise.all(["seed-jordan", "seed-taylor", "seed-alex"].map(ctx));
  await t.db.insert(user).values({ id: "new", name: "Nina Newcomer", email: "nina@example.com" });
});
afterAll(async () => {
  await t.client.close();
});

describe("practices and their leads (Scenario 8)", () => {
  let practiceId: string;
  it("the Site Lead creates a practice and appoints its lead; that person can then edit its roles", async () => {
    const p = await createPractice(t.db, jordan, {
      name: " Platform Engineering ",
      description: "Internal platforms.",
      leadUserId: "seed-ben",
    });
    practiceId = p.id;
    expect(p).toMatchObject({
      name: "Platform Engineering",
      slug: "platform-engineering",
      description: "Internal platforms.",
    });
    expect(await t.db.select().from(practiceLeads).where(eq(practiceLeads.practiceId, p.id))).toHaveLength(1);
    expect(await lastAudit()).toMatchObject({
      actorId: "seed-jordan",
      action: "create",
      entity: "practice",
      entityId: p.id,
    });
    expect((await lastAudit()).after).toMatchObject({
      summary: "created the practice “Platform Engineering” with Ben Carter as its Practice Lead",
    });

    const ben = await ctx("seed-ben");
    expect(ben.actor.leadOf.map((x) => x.slug)).toEqual(["platform-engineering"]);
    const role = await createRole(t.db, ben, {
      practiceId: p.id,
      name: "Platform Engineer",
      description: "Runs the platform.",
    });
    expect(role.practiceId).toBe(p.id);
    await reject(
      createRole(t.db, ben, { practiceId: taylor.actor.leadOf[0].id, name: "Not Mine", description: "x" }),
      ForbiddenError,
    );
  });

  it("refuses anyone but a Site Lead, a name that exists, a missing name and a lead who doesn't exist", async () => {
    for (const who of [taylor, alex])
      await reject(createPractice(t.db, who, { name: "Sneaky", leadUserId: "seed-ben" }), ForbiddenError);
    expect(
      (await reject(createPractice(t.db, jordan, { name: "frontend  practice", leadUserId: "seed-ben" })))
        .message,
    ).toContain("already exists");
    await reject(createPractice(t.db, jordan, { name: "  ", leadUserId: "seed-ben" }));
    await reject(createPractice(t.db, jordan, { name: "Nobody Leads", leadUserId: "ghost" }));
    expect(await t.db.select().from(practices).where(eq(practices.name, "Nobody Leads"))).toHaveLength(0);
  });

  it("numbers a slug that clashes", async () => {
    const p = await createPractice(t.db, jordan, {
      name: "Platform-Engineering Two",
      leadUserId: "seed-ben",
    });
    expect(p.slug).toBe("platform-engineering-two");
  });

  it("appoints and removes leads, but never the last one", async () => {
    await appointLead(t.db, jordan, { practiceId, userId: "seed-lena" });
    expect((await lastAudit()).after).toMatchObject({
      summary: "appointed Lena Hoffmann as Practice Lead of “Platform Engineering”",
    });
    expect((await reject(appointLead(t.db, jordan, { practiceId, userId: "seed-lena" }))).message).toContain(
      "already leads",
    );
    await removeLead(t.db, jordan, { practiceId, userId: "seed-ben" });
    expect((await lastAudit()).before).toMatchObject({
      summary: "removed Ben Carter as Practice Lead of “Platform Engineering”",
    });
    expect((await reject(removeLead(t.db, jordan, { practiceId, userId: "seed-lena" }))).message).toContain(
      "needs at least one Practice Lead",
    );
    await reject(removeLead(t.db, jordan, { practiceId, userId: "seed-alex" }));
    await reject(appointLead(t.db, taylor, { practiceId, userId: "seed-alex" }), ForbiddenError);
    expect((await ctx("seed-ben")).actor.leadOf.map((x) => x.id)).not.toContain(practiceId); // no longer a lead of it
  });

  it("renames a practice and records it; a clash is refused", async () => {
    await updatePractice(t.db, jordan, {
      id: practiceId,
      name: "Platform & Cloud",
      description: "Platforms and the cloud under them.",
    });
    expect((await lastAudit()).after).toMatchObject({
      summary: "renamed the practice “Platform Engineering” to “Platform & Cloud”",
    });
    await reject(updatePractice(t.db, jordan, { id: practiceId, name: "Data & AI" }));
    await reject(updatePractice(t.db, taylor, { id: practiceId, name: "Mine now" }), ForbiddenError);
    const count = (await t.db.select().from(auditLog)).length;
    await updatePractice(t.db, jordan, { id: practiceId, name: "Platform & Cloud" }); // nothing changed: nothing recorded
    expect(await t.db.select().from(auditLog)).toHaveLength(count);
  });
});

describe("people and reporting lines", () => {
  it("lists everyone who has signed in, including those without a profile", async () => {
    const people = await listPeople(t.db);
    expect(people.find((p) => p.id === "new")).toMatchObject({
      practiceId: null,
      managerId: null,
      siteLead: false,
      leads: [],
      reports: 0,
    });
    expect(people.find((p) => p.id === "seed-morgan")).toMatchObject({ reports: 5 });
    expect(people.find((p) => p.id === "seed-jordan")!.siteLead).toBe(true);
    expect(people.find((p) => p.id === "seed-taylor")!.leads).toHaveLength(1);
    expect(Object.keys(people[0]).sort()).toEqual([
      "email",
      "id",
      "leads",
      "managerId",
      "name",
      "practiceId",
      "reports",
      "siteLead",
    ]); // no skills
  });

  it("puts a new person in a practice and under a manager, creating their profile", async () => {
    const frontend = taylor.actor.leadOf[0].id;
    await setPersonPractice(t.db, jordan, { userId: "new", practiceId: frontend });
    await setPersonManager(t.db, jordan, { userId: "new", managerId: "seed-morgan" });
    expect((await lastAudit()).after).toMatchObject({
      summary: "made Morgan Lee the manager of Nina Newcomer",
    });
    const nina = (await ctx("new")).actor;
    expect(nina.practiceId).toBe(frontend);
    expect((await ctx("seed-morgan")).actor.reportCount).toBe(6);
    await setPersonPractice(t.db, jordan, { userId: "new", practiceId: null });
    expect((await ctx("new")).actor.practiceId).toBeNull();
  });

  it("refuses reporting to oneself or in a loop, an unknown person, and anyone but the Site Lead", async () => {
    await reject(setPersonManager(t.db, jordan, { userId: "seed-alex", managerId: "seed-alex" }));
    // Morgan manages Alex: Alex can't manage Morgan; and nobody in the chain can be made to manage upwards
    await reject(
      setPersonManager(t.db, jordan, { userId: "seed-morgan", managerId: "seed-alex" }),
      EditError,
    ).then(() => {});
    await setPersonManager(t.db, jordan, { userId: "seed-alex", managerId: "seed-morgan" }); // unchanged: no problem
    await setPersonManager(t.db, jordan, { userId: "seed-morgan", managerId: "seed-riley" });
    const err = await reject(
      setPersonManager(t.db, jordan, { userId: "seed-riley", managerId: "seed-alex" }),
    ); // Riley -> Alex -> Morgan -> Riley
    expect(err.message).toContain("loop");
    await reject(setPersonManager(t.db, jordan, { userId: "ghost", managerId: null }));
    await reject(
      setPersonPractice(t.db, jordan, {
        userId: "seed-alex",
        practiceId: "00000000-0000-4000-8000-0000000000ee",
      }),
    );
    for (const who of [taylor, alex]) {
      await reject(setPersonManager(t.db, who, { userId: "new", managerId: null }), ForbiddenError);
      await reject(setPersonPractice(t.db, who, { userId: "new", practiceId: null }), ForbiddenError);
    }
    await setPersonManager(t.db, jordan, { userId: "seed-morgan", managerId: null });
  });

  it("Site Leads can be added and removed, never the last", async () => {
    await addSiteLead(t.db, jordan, "seed-casey");
    await reject(addSiteLead(t.db, jordan, "seed-casey"));
    expect((await ctx("seed-casey")).actor.siteLead).toBe(true);
    await removeSiteLead(t.db, jordan, "seed-casey");
    expect((await reject(removeSiteLead(t.db, jordan, "seed-jordan"))).message).toContain(
      "at least one Site Lead",
    );
    await reject(removeSiteLead(t.db, jordan, "seed-alex"));
    await reject(addSiteLead(t.db, taylor, "seed-alex"), ForbiddenError);
  });
});

describe("merging catalogue items", () => {
  it("shows the impact first, then moves everything over and removes the duplicate", async () => {
    await refresh();
    const keep = id("Terraform");
    const drop = id("Bicep");
    const holdersBefore = await t.db.select().from(profileItems).where(eq(profileItems.nodeId, drop));
    const requiredBy = graph.edges.filter((e) => e.kind === "requires" && e.targetId === drop).length;
    const impact = await mergeImpact(t.db, keep, drop);
    expect(impact.problems).toEqual([]);
    expect(impact.people).toBe(holdersBefore.length);
    expect(impact.requirementsMoved + impact.requirementConflicts.length).toBe(requiredBy);

    const result = await mergeItems(t.db, jordan, { keepId: keep, dropId: drop });
    expect(result.people).toBe(holdersBefore.length);
    await refresh();
    expect(graph.nodes.has(drop)).toBe(false);
    expect(graph.edges.some((e) => e.sourceId === drop || e.targetId === drop)).toBe(false);
    // each role that required the duplicate requires the kept item now
    const owners = new Set(
      graph.edges.filter((e) => e.kind === "requires" && e.targetId === keep).map((e) => e.sourceId),
    );
    for (const h of holdersBefore) {
      const held = await t.db.select().from(profileItems).where(eq(profileItems.userId, h.userId));
      expect(held.some((x) => x.nodeId === keep)).toBe(true);
      expect(held.some((x) => x.nodeId === drop)).toBe(false);
    }
    expect(owners.size).toBeGreaterThanOrEqual(1);
    const row = await lastAudit();
    expect(row).toMatchObject({ action: "delete", entity: "node", entityId: drop, actorId: "seed-jordan" });
    expect(row.after).toMatchObject({ summary: "merged “Bicep” into “Terraform”", mergedInto: "Terraform" });
  });

  it("a requirement both items had keeps the stronger weight, and recommendations and holders follow", async () => {
    await refresh();
    const [keep, drop] = [id("Docker"), id("Kubernetes")];
    // a role requiring both, at different weights, and people holding / being recommended the duplicate
    const role = id("DevOps Engineer");
    const weightOf = (item: string) =>
      graph.edges.find((e) => e.kind === "requires" && e.sourceId === role && e.targetId === item)?.priority;
    const kBefore = weightOf(keep);
    const dBefore = weightOf(drop);
    await t.db.insert(profileItems).values({ userId: "seed-alex", nodeId: drop }).onConflictDoNothing();
    await t.db.insert(profileItems).values({ userId: "seed-alex", nodeId: keep }).onConflictDoNothing();
    await t.db
      .insert(recommendations)
      .values({ personId: "seed-mia", authorId: "seed-morgan", nodeId: drop, comment: "x" });
    await mergeItems(t.db, jordan, { keepId: keep, dropId: drop });
    await refresh();
    const after = weightOf(keep)!;
    const order = ["critical", "important", "nice"];
    if (kBefore && dBefore)
      expect(order.indexOf(after)).toBe(Math.min(order.indexOf(kBefore), order.indexOf(dBefore)));
    expect(
      (await t.db.select().from(recommendations).where(eq(recommendations.personId, "seed-mia")))[0].nodeId,
    ).toBe(keep);
    const alexItems = await t.db.select().from(profileItems).where(eq(profileItems.userId, "seed-alex"));
    expect(alexItems.filter((i) => i.nodeId === keep)).toHaveLength(1); // not doubled
    expect(alexItems.some((i) => i.nodeId === drop)).toBe(false);
  });

  it("refuses different types, the same item, roles, and anyone but the Site Lead; nothing changes", async () => {
    await refresh();
    const before = (await t.db.select().from(edges)).length;
    await reject(mergeItems(t.db, jordan, { keepId: id("SQL"), dropId: id("Communication") }));
    await reject(mergeItems(t.db, jordan, { keepId: id("SQL"), dropId: id("SQL") }));
    await reject(mergeItems(t.db, jordan, { keepId: id("SQL"), dropId: id("Data Engineer") }));
    for (const who of [taylor, alex])
      await reject(mergeItems(t.db, who, { keepId: id("SQL"), dropId: id("Python") }), ForbiddenError);
    expect(await t.db.select().from(edges)).toHaveLength(before);
    expect((await mergeImpact(t.db, id("SQL"), id("Communication"))).problems.join()).toContain("same type");
  });
});

describe("categories", () => {
  it("lists them with counts, renames one across its items, and sets or clears an item's category", async () => {
    const categories = await listCategories(t.db);
    const tools = categories.find((c) => c.category === "Tool / platform")!;
    expect(tools.n).toBeGreaterThan(5);
    const changed = await renameCategory(t.db, jordan, {
      from: "Tool / platform",
      to: "Tools and platforms",
    });
    expect(changed).toBe(tools.n);
    expect((await listCategories(t.db)).some((c) => c.category === "Tool / platform")).toBe(false);
    expect((await lastAudit()).after).toMatchObject({
      summary: `renamed the category “Tool / platform” to “Tools and platforms” (${tools.n} items)`,
    });

    await refresh();
    await setItemCategory(t.db, jordan, { itemId: id("SQL"), category: "Query languages" });
    expect((await lastAudit()).after).toMatchObject({
      summary: "put “SQL” in the category “Query languages”",
    });
    const count = (await t.db.select().from(auditLog)).length;
    await setItemCategory(t.db, jordan, { itemId: id("SQL"), category: "Query languages" }); // no change
    expect(await t.db.select().from(auditLog)).toHaveLength(count);
    await setItemCategory(t.db, jordan, { itemId: id("SQL"), category: null });
    expect(
      (
        await t.db
          .select()
          .from(nodes)
          .where(eq(nodes.id, id("SQL")))
      )[0].category,
    ).toBeNull();
  });
  it("refuses an empty name, an unknown category, a role, and anyone but the Site Lead", async () => {
    await reject(renameCategory(t.db, jordan, { from: "Data", to: "  " }));
    await reject(renameCategory(t.db, jordan, { from: "No such category", to: "x" }));
    await reject(setItemCategory(t.db, jordan, { itemId: id("Data Engineer"), category: "x" }));
    await reject(renameCategory(t.db, taylor, { from: "Cloud", to: "x" }), ForbiddenError);
    await reject(setItemCategory(t.db, alex, { itemId: id("SQL"), category: "x" }), ForbiddenError);
  });
});

describe("the audit log", () => {
  it("pages, newest first, filters by kind, and names who did it", async () => {
    const all = await auditPage(t.db, jordan, { pageSize: 5 });
    expect(all.total).toBeGreaterThan(10);
    expect(all.rows).toHaveLength(5);
    expect(all.pages).toBe(Math.ceil(all.total / 5));
    expect(all.rows[0].at.getTime()).toBeGreaterThanOrEqual(all.rows[1].at.getTime());
    expect(all.rows.every((r) => r.actor)).toBe(true);
    const page2 = await auditPage(t.db, jordan, { pageSize: 5, page: 2 });
    expect(page2.rows[0].id).not.toBe(all.rows[0].id);
    const practices = await auditPage(t.db, jordan, { entity: "practice" });
    expect(practices.rows.length).toBeGreaterThanOrEqual(2);
    expect(practices.rows.every((r) => r.entity === "practice")).toBe(true);
  });
  it("only the Site Lead reads it", async () => {
    for (const who of [taylor, alex]) await reject(auditPage(t.db, who), ForbiddenError);
  });
});
