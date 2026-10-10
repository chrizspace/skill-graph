/**
 * What only the Site Lead does (docs/PLAN.md §1 "Site Lead", §3): practices and who leads them, people and reporting
 * lines, merging duplicate catalogue items and keeping their categories, and reading the audit log. Each change checks
 * the permission, writes and appends an audit row in the same transaction. The audit rows of these changes carry a
 * `summary` sentence, because a practice or an appointment isn't a node or a link.
 */
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { can, type Actor } from "../domain/access";
import { isCatalogue } from "../domain/graph";
import { normalizeName, slugify } from "../domain/names";
import { planMerge, reportingCycle } from "../domain/site";
import type { Database } from "./database";
import { loadGraph } from "./graph";
import { EditError, ForbiddenError } from "./graph-write";
import {
  auditLog,
  edges,
  nodes,
  practiceLeads,
  practices,
  profileItems,
  profiles,
  recommendations,
  siteLeads,
  sites,
  user,
} from "./schema";

export interface SiteContext {
  actor: Actor;
}

const fail = (...problems: string[]): never => {
  throw new EditError(problems);
};
const allow = (ok: boolean) => {
  if (!ok) throw new ForbiddenError();
};

async function audit(
  tx: Database,
  ctx: SiteContext,
  entry: {
    action: "create" | "update" | "delete";
    entity: "practice" | "access" | "profile" | "node" | "edge";
    entityId: string;
    summary: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  },
) {
  await tx.insert(auditLog).values({
    actorId: ctx.actor.userId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    before: entry.before ? { ...entry.before, summary: entry.summary } : null,
    after: { ...entry.after, summary: entry.summary },
  });
}

const personName = async (tx: Database, id: string) => {
  const [row] = await tx.select({ name: user.name }).from(user).where(eq(user.id, id));
  return row?.name ?? fail("That person doesn't exist.");
};

// ---------------------------------------------------------------------------------------------------- practices

/** A new practice with its first Practice Lead (a practice needs at least one). */
export async function createPractice(
  db: Database,
  ctx: SiteContext,
  input: { name: string; description?: string; leadUserId: string },
) {
  allow(can(ctx.actor, "site:manage"));
  const name = input.name.trim();
  const description = (input.description ?? "").trim();
  if (!name) fail("A practice needs a name.");
  if (name.length > 120) fail("The name can be at most 120 characters.");
  if (description.length > 2000) fail("The description can be at most 2000 characters.");
  return db.transaction(async (tx) => {
    const [site] = await tx.select({ id: sites.id }).from(sites).limit(1);
    if (!site) fail("There is no site yet.");
    const existing = await tx.select({ name: practices.name, slug: practices.slug }).from(practices);
    if (existing.some((p) => normalizeName(p.name) === normalizeName(name)))
      fail(`A practice called "${name}" already exists.`);
    const leadName = await personName(tx, input.leadUserId);
    let slug = slugify(name);
    for (let i = 2; existing.some((p) => p.slug === slug); i++) slug = `${slugify(name)}-${i}`;
    const [row] = await tx
      .insert(practices)
      .values({ siteId: site!.id, name, slug, description })
      .returning();
    await tx.insert(practiceLeads).values({ practiceId: row.id, userId: input.leadUserId });
    await audit(tx, ctx, {
      action: "create",
      entity: "practice",
      entityId: row.id,
      summary: `created the practice “${name}” with ${leadName} as its Practice Lead`,
      after: { name, slug, lead: leadName },
    });
    return row;
  });
}

export async function updatePractice(
  db: Database,
  ctx: SiteContext,
  input: { id: string; name?: string; description?: string },
) {
  allow(can(ctx.actor, "site:manage"));
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(practices).where(eq(practices.id, input.id));
    if (!row) fail("That practice doesn't exist.");
    const name = input.name?.trim() ?? row.name;
    const description = input.description?.trim() ?? row.description;
    if (!name) fail("A practice needs a name.");
    if (name.length > 120 || description.length > 2000) fail("That is too long.");
    if (name !== row.name) {
      const others = await tx.select({ id: practices.id, name: practices.name }).from(practices);
      if (others.some((p) => p.id !== row.id && normalizeName(p.name) === normalizeName(name)))
        fail(`A practice called "${name}" already exists.`);
    }
    if (name === row.name && description === row.description) return row;
    const [after] = await tx
      .update(practices)
      .set({ name, description })
      .where(eq(practices.id, row.id))
      .returning();
    await audit(tx, ctx, {
      action: "update",
      entity: "practice",
      entityId: row.id,
      summary:
        name === row.name
          ? `changed the description of “${name}”`
          : `renamed the practice “${row.name}” to “${name}”`,
      before: { name: row.name, description: row.description },
      after: { name, description },
    });
    return after;
  });
}

export async function appointLead(
  db: Database,
  ctx: SiteContext,
  input: { practiceId: string; userId: string },
) {
  allow(can(ctx.actor, "site:manage"));
  return db.transaction(async (tx) => {
    const [practice] = await tx
      .select({ name: practices.name })
      .from(practices)
      .where(eq(practices.id, input.practiceId));
    if (!practice) fail("That practice doesn't exist.");
    const who = await personName(tx, input.userId);
    const [already] = await tx
      .select()
      .from(practiceLeads)
      .where(and(eq(practiceLeads.practiceId, input.practiceId), eq(practiceLeads.userId, input.userId)));
    if (already) fail(`${who} already leads ${practice!.name}.`);
    await tx.insert(practiceLeads).values({ practiceId: input.practiceId, userId: input.userId });
    await audit(tx, ctx, {
      action: "create",
      entity: "access",
      entityId: `${input.practiceId}:${input.userId}`,
      summary: `appointed ${who} as Practice Lead of “${practice!.name}”`,
      after: { practice: practice!.name, person: who, role: "practice_lead" },
    });
  });
}

/** Takes someone off a practice's leads. The last lead can't be removed: appoint the next one first. */
export async function removeLead(
  db: Database,
  ctx: SiteContext,
  input: { practiceId: string; userId: string },
) {
  allow(can(ctx.actor, "site:manage"));
  return db.transaction(async (tx) => {
    const [practice] = await tx
      .select({ name: practices.name })
      .from(practices)
      .where(eq(practices.id, input.practiceId));
    if (!practice) fail("That practice doesn't exist.");
    const leads = await tx
      .select({ userId: practiceLeads.userId })
      .from(practiceLeads)
      .where(eq(practiceLeads.practiceId, input.practiceId));
    if (!leads.some((l) => l.userId === input.userId)) fail("They don't lead this practice.");
    if (leads.length === 1)
      fail(`${practice!.name} needs at least one Practice Lead: appoint another before removing this one.`);
    const who = await personName(tx, input.userId);
    await tx
      .delete(practiceLeads)
      .where(and(eq(practiceLeads.practiceId, input.practiceId), eq(practiceLeads.userId, input.userId)));
    await audit(tx, ctx, {
      action: "delete",
      entity: "access",
      entityId: `${input.practiceId}:${input.userId}`,
      summary: `removed ${who} as Practice Lead of “${practice!.name}”`,
      before: { practice: practice!.name, person: who, role: "practice_lead" },
    });
  });
}

// ---------------------------------------------------------------------------------------------------- people

export interface PersonAdminRow {
  id: string;
  name: string;
  email: string;
  practiceId: string | null;
  managerId: string | null;
  siteLead: boolean;
  leads: string[];
  reports: number;
}

/** Everyone who has signed in, with where they sit in the organisation. No skills, no profile content. */
export async function listPeople(db: Database): Promise<PersonAdminRow[]> {
  const [users, profs, sl, pl] = await Promise.all([
    db.select({ id: user.id, name: user.name, email: user.email }).from(user).orderBy(user.name),
    db
      .select({ userId: profiles.userId, practiceId: profiles.practiceId, managerId: profiles.managerId })
      .from(profiles),
    db.select({ userId: siteLeads.userId }).from(siteLeads),
    db.select({ userId: practiceLeads.userId, practiceId: practiceLeads.practiceId }).from(practiceLeads),
  ]);
  return users.map((u) => {
    const p = profs.find((x) => x.userId === u.id);
    return {
      ...u,
      practiceId: p?.practiceId ?? null,
      managerId: p?.managerId ?? null,
      siteLead: sl.some((x) => x.userId === u.id),
      leads: pl.filter((x) => x.userId === u.id).map((x) => x.practiceId),
      reports: profs.filter((x) => x.managerId === u.id).length,
    };
  });
}

async function ensureProfile(tx: Database, userId: string) {
  await tx.insert(profiles).values({ userId }).onConflictDoNothing();
}

export async function setPersonPractice(
  db: Database,
  ctx: SiteContext,
  input: { userId: string; practiceId: string | null },
) {
  allow(can(ctx.actor, "site:manage"));
  return db.transaction(async (tx) => {
    const who = await personName(tx, input.userId);
    let practiceName: string | null = null;
    if (input.practiceId) {
      const [p] = await tx
        .select({ name: practices.name })
        .from(practices)
        .where(eq(practices.id, input.practiceId));
      practiceName = p?.name ?? fail("That practice doesn't exist.");
    }
    await ensureProfile(tx, input.userId);
    const [before] = await tx
      .select({ practiceId: profiles.practiceId })
      .from(profiles)
      .where(eq(profiles.userId, input.userId));
    if ((before?.practiceId ?? null) === input.practiceId) return;
    await tx.update(profiles).set({ practiceId: input.practiceId }).where(eq(profiles.userId, input.userId));
    await audit(tx, ctx, {
      action: "update",
      entity: "profile",
      entityId: input.userId,
      summary: practiceName
        ? `put ${who} in the practice “${practiceName}”`
        : `took ${who} out of their practice`,
      after: { person: who, practice: practiceName },
    });
  });
}

/** Sets who someone reports to (or nobody). Nobody reports to themselves, and no loops. */
export async function setPersonManager(
  db: Database,
  ctx: SiteContext,
  input: { userId: string; managerId: string | null },
) {
  allow(can(ctx.actor, "site:manage"));
  return db.transaction(async (tx) => {
    const who = await personName(tx, input.userId);
    if (input.managerId === input.userId) fail("Nobody can report to themselves.");
    const managerName = input.managerId ? await personName(tx, input.managerId) : null;
    const rows = await tx.select({ userId: profiles.userId, managerId: profiles.managerId }).from(profiles);
    const managerOf = new Map(rows.map((r) => [r.userId, r.managerId]));
    if (reportingCycle(managerOf, input.userId, input.managerId)) {
      fail(`${managerName} already reports to ${who}, directly or not: that would make a loop.`);
    }
    await ensureProfile(tx, input.userId);
    if ((managerOf.get(input.userId) ?? null) === input.managerId) return;
    await tx.update(profiles).set({ managerId: input.managerId }).where(eq(profiles.userId, input.userId));
    await audit(tx, ctx, {
      action: "update",
      entity: "profile",
      entityId: input.userId,
      summary: managerName ? `made ${managerName} the manager of ${who}` : `took ${who}'s manager away`,
      after: { person: who, manager: managerName },
    });
  });
}

export async function addSiteLead(db: Database, ctx: SiteContext, userId: string) {
  allow(can(ctx.actor, "site:manage"));
  return db.transaction(async (tx) => {
    const [site] = await tx.select({ id: sites.id }).from(sites).limit(1);
    const who = await personName(tx, userId);
    const [already] = await tx.select().from(siteLeads).where(eq(siteLeads.userId, userId));
    if (already) fail(`${who} is already a Site Lead.`);
    await tx.insert(siteLeads).values({ siteId: site!.id, userId });
    await audit(tx, ctx, {
      action: "create",
      entity: "access",
      entityId: `site:${userId}`,
      summary: `appointed ${who} as Site Lead`,
      after: { person: who, role: "site_lead" },
    });
  });
}

export async function removeSiteLead(db: Database, ctx: SiteContext, userId: string) {
  allow(can(ctx.actor, "site:manage"));
  return db.transaction(async (tx) => {
    const leads = await tx.select({ userId: siteLeads.userId }).from(siteLeads);
    if (!leads.some((l) => l.userId === userId)) fail("They aren't a Site Lead.");
    if (leads.length === 1)
      fail("The site needs at least one Site Lead: appoint another before removing this one.");
    const who = await personName(tx, userId);
    await tx.delete(siteLeads).where(eq(siteLeads.userId, userId));
    await audit(tx, ctx, {
      action: "delete",
      entity: "access",
      entityId: `site:${userId}`,
      summary: `removed ${who} as Site Lead`,
      before: { person: who, role: "site_lead" },
    });
  });
}

// ---------------------------------------------------------------------------------------------------- the catalogue

export interface MergeImpact {
  problems: string[];
  requirementsMoved: number;
  requirementConflicts: { owner: string; kept: string; dropped: string; result: string }[];
  linksMoved: number;
  linksDropped: number;
  /** people who hold the item that will be dropped: they will hold the kept one */
  people: number;
  recommendations: number;
}

/** What merging `dropId` into `keepId` would do, for the confirmation window. */
export async function mergeImpact(db: Database, keepId: string, dropId: string): Promise<MergeImpact> {
  const graph = await loadGraph(db);
  const plan = planMerge(graph, keepId, dropId);
  const [holders] = await db.select({ n: count() }).from(profileItems).where(eq(profileItems.nodeId, dropId));
  const [recs] = await db
    .select({ n: count() })
    .from(recommendations)
    .where(eq(recommendations.nodeId, dropId));
  return {
    problems: plan.problems,
    requirementsMoved: plan.requirementsMoved,
    requirementConflicts: plan.requirementConflicts,
    linksMoved: plan.linksMoved,
    linksDropped: plan.linksDropped,
    people: holders?.n ?? 0,
    recommendations: recs?.n ?? 0,
  };
}

/**
 * Merges a duplicate catalogue item into the one to keep: every link, every holder (their dates kept) and every
 * recommendation moves over, a requirement both had keeps the stronger weight, and the duplicate is deleted.
 */
export async function mergeItems(db: Database, ctx: SiteContext, input: { keepId: string; dropId: string }) {
  allow(can(ctx.actor, "catalogue:manage"));
  return db.transaction(async (tx) => {
    const graph = await loadGraph(tx);
    const plan = planMerge(graph, input.keepId, input.dropId);
    if (plan.problems.length) fail(...plan.problems);
    const keep = graph.nodes.get(input.keepId)!;
    const drop = graph.nodes.get(input.dropId)!;

    const rows = await tx
      .select()
      .from(edges)
      .where(sql`${edges.sourceId} = ${drop.id} or ${edges.targetId} = ${drop.id}`);
    const rowOf = (e: { kind: string; sourceId: string; targetId: string }) =>
      rows.find((r) => r.kind === e.kind && r.sourceId === e.sourceId && r.targetId === e.targetId)!;
    for (const m of plan.moves) {
      await tx
        .update(edges)
        .set({ sourceId: m.sourceId, targetId: m.targetId })
        .where(eq(edges.id, rowOf(m.edge).id));
    }
    for (const u of plan.upgrades) {
      const [kept] = await tx
        .select()
        .from(edges)
        .where(
          and(eq(edges.kind, "requires"), eq(edges.sourceId, u.edge.sourceId), eq(edges.targetId, keep.id)),
        );
      if (kept) await tx.update(edges).set({ priority: u.priority }).where(eq(edges.id, kept.id));
    }

    // people who hold the duplicate hold the kept item instead (an existing row, with its dates, wins)
    const held = await tx.select().from(profileItems).where(eq(profileItems.nodeId, drop.id));
    const alreadyHave = new Set(
      (
        await tx
          .select({ userId: profileItems.userId })
          .from(profileItems)
          .where(eq(profileItems.nodeId, keep.id))
      ).map((r) => r.userId),
    );
    for (const h of held) {
      if (alreadyHave.has(h.userId))
        await tx
          .delete(profileItems)
          .where(and(eq(profileItems.userId, h.userId), eq(profileItems.nodeId, drop.id)));
      else
        await tx
          .update(profileItems)
          .set({ nodeId: keep.id })
          .where(and(eq(profileItems.userId, h.userId), eq(profileItems.nodeId, drop.id)));
    }
    const recs = await tx
      .update(recommendations)
      .set({ nodeId: keep.id })
      .where(eq(recommendations.nodeId, drop.id))
      .returning({ id: recommendations.id });

    await tx.delete(nodes).where(eq(nodes.id, drop.id)); // its remaining links go with it
    await audit(tx, ctx, {
      action: "delete",
      entity: "node",
      entityId: drop.id,
      summary: `merged “${drop.name}” into “${keep.name}”`,
      before: { type: drop.type, name: drop.name, slug: drop.slug, category: drop.category },
      after: {
        mergedInto: keep.name,
        requirementsMoved: plan.requirementsMoved,
        linksMoved: plan.linksMoved,
        linksDropped: plan.linksDropped,
        people: held.length,
        recommendations: recs.length,
      },
    });
    return { requirementsMoved: plan.requirementsMoved, people: held.length };
  });
}

/** The categories of the catalogue with how many items each has. */
export async function listCategories(db: Database) {
  const rows = await db
    .select({ category: nodes.category, n: count() })
    .from(nodes)
    .where(inArray(nodes.type, ["technical_skill", "soft_skill", "certification"]))
    .groupBy(nodes.category);
  return rows
    .filter((r): r is { category: string; n: number } => Boolean(r.category))
    .sort((a, b) => a.category.localeCompare(b.category));
}

/** Renames a category on every catalogue item that has it (also how two categories are merged). */
export async function renameCategory(db: Database, ctx: SiteContext, input: { from: string; to: string }) {
  allow(can(ctx.actor, "catalogue:manage"));
  const to = input.to.trim();
  if (!to) fail("Give the category a name.");
  if (to.length > 80) fail("A category name can be at most 80 characters.");
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(nodes)
      .set({ category: to })
      .where(
        and(
          eq(nodes.category, input.from),
          inArray(nodes.type, ["technical_skill", "soft_skill", "certification"]),
        ),
      )
      .returning({ id: nodes.id });
    if (updated.length === 0) fail(`No item has the category "${input.from}".`);
    if (input.from !== to) {
      await audit(tx, ctx, {
        action: "update",
        entity: "node",
        entityId: `category:${input.from}`,
        summary: `renamed the category “${input.from}” to “${to}” (${updated.length} ${updated.length === 1 ? "item" : "items"})`,
        before: { category: input.from },
        after: { category: to, items: updated.length },
      });
    }
    return updated.length;
  });
}

/** Sets or clears one item's category. */
export async function setItemCategory(
  db: Database,
  ctx: SiteContext,
  input: { itemId: string; category: string | null },
) {
  allow(can(ctx.actor, "catalogue:manage"));
  const category = input.category?.trim() || null;
  if (category && category.length > 80) fail("A category name can be at most 80 characters.");
  return db.transaction(async (tx) => {
    const graph = await loadGraph(tx);
    const item = graph.nodes.get(input.itemId);
    if (!item || !isCatalogue(item)) fail("That isn't a skill or certification.");
    if ((item!.category ?? null) === category) return;
    await tx.update(nodes).set({ category }).where(eq(nodes.id, input.itemId));
    await audit(tx, ctx, {
      action: "update",
      entity: "node",
      entityId: input.itemId,
      summary: category
        ? `put “${item!.name}” in the category “${category}”`
        : `took “${item!.name}” out of its category`,
      before: { category: item!.category },
      after: { category },
    });
  });
}

// ---------------------------------------------------------------------------------------------------- the audit log

export interface AuditRow {
  id: string;
  at: Date;
  actor: string | null;
  action: string;
  entity: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changeRequestId: string | null;
}

/** One page of the audit log, newest first, optionally of one kind of thing. */
export async function auditPage(
  db: Database,
  ctx: SiteContext,
  { entity, page = 1, pageSize = 25 }: { entity?: string; page?: number; pageSize?: number } = {},
) {
  allow(can(ctx.actor, "audit:view"));
  const where = entity ? eq(auditLog.entity, entity as typeof auditLog.$inferSelect.entity) : undefined;
  const [{ n }] = await db.select({ n: count() }).from(auditLog).where(where);
  const rows = await db
    .select({
      id: auditLog.id,
      at: auditLog.at,
      actor: user.name,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      before: auditLog.before,
      after: auditLog.after,
      changeRequestId: auditLog.changeRequestId,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorId))
    .where(where)
    .orderBy(desc(auditLog.at))
    .limit(pageSize)
    .offset((Math.max(1, page) - 1) * pageSize);
  return { total: n, pages: Math.max(1, Math.ceil(n / pageSize)), rows: rows as AuditRow[] };
}
