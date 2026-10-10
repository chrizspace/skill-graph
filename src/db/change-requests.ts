/**
 * Change requests (docs/PLAN.md §1, §3, §4): a manager's feedback on a role or path, or a proposal for a new role or
 * specialisation, reviewed by the practice's Practice Leads. Approving applies every operation in ONE transaction through
 * the same write functions the editor uses (src/db/graph-write.ts), with the request's id on every audit row; if one
 * operation no longer applies, nothing is applied and the reviewer is told which.
 */
import { and, eq, inArray, or } from "drizzle-orm";
import { can, type Actor } from "../domain/access";
import { changesSchema, isPending, type Change, type RequestStatus } from "../domain/change-requests";
import { isRoleLike } from "../domain/graph";
import { validateChanges } from "../domain/validate";
import type { Database } from "./database";
import { loadGraph } from "./graph";
import {
  addPath,
  addRequirement,
  createCatalogueItem,
  createRole,
  createSpecialization,
  EditError,
  ForbiddenError,
  removePath,
  removeRequirement,
  updateRequirement,
  updateRoleLike,
  type EditContext,
} from "./graph-write";
import { auditLog, changeRequestComments, changeRequests, practices, user } from "./schema";

export { EditError, ForbiddenError };

export interface RequestRow {
  id: string;
  practiceId: string;
  roleId: string | null;
  authorId: string | null;
  status: RequestStatus;
  reason: string;
  changes: Change[];
  decidedBy: string | null;
  decidedAt: Date | null;
  decisionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const toRow = (r: typeof changeRequests.$inferSelect): RequestRow => ({
  ...r,
  changes: changesSchema.parse(r.changes),
});

const fail = (...problems: string[]) => {
  throw new EditError(problems);
};

async function audit(
  tx: Database,
  actor: Actor,
  action: "create" | "update",
  requestId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
) {
  await tx.insert(auditLog).values({
    actorId: actor.userId,
    action,
    entity: "change_request",
    entityId: requestId,
    before,
    after,
    changeRequestId: requestId,
  });
}

// ---------------------------------------------------------------------------------------------------- sending

/** A manager (or Practice Lead) sends feedback on a role, or proposes a new role or specialisation, to a practice's leads. */
export async function createRequest(
  db: Database,
  actor: Actor,
  input: { practiceId: string; roleId: string | null; reason: string; changes: unknown },
): Promise<RequestRow> {
  if (!can(actor, "changeRequest:create", { practiceId: input.practiceId })) throw new ForbiddenError();
  const reason = input.reason.trim();
  if (!reason) fail("Say why: the reviewers need the reason.");
  if (reason.length > 2000) fail("The reason can be at most 2000 characters.");
  const parsed = changesSchema.safeParse(input.changes);
  if (!parsed.success) fail(...parsed.error.issues.map((i) => i.message));
  const changes = parsed.data!;

  return db.transaction(async (tx) => {
    const graph = await loadGraph(tx);
    const [practice] = await tx
      .select({ id: practices.id })
      .from(practices)
      .where(eq(practices.id, input.practiceId));
    if (!practice) fail("That practice doesn't exist.");
    if (input.roleId) {
      const subject = graph.nodes.get(input.roleId);
      if (!subject || !isRoleLike(subject) || subject.status !== "published") {
        fail("That role or specialisation doesn't exist.");
      }
    }
    const problems = validateChanges(graph, { practiceId: input.practiceId, roleId: input.roleId }, changes);
    if (problems.length) fail(...problems);
    const [row] = await tx
      .insert(changeRequests)
      .values({ practiceId: input.practiceId, roleId: input.roleId, authorId: actor.userId, reason, changes })
      .returning();
    await audit(tx, actor, "create", row.id, null, {
      status: "open",
      practiceId: row.practiceId,
      roleId: row.roleId,
      operations: changes.length,
    });
    return toRow(row);
  });
}

// ---------------------------------------------------------------------------------------------------- reading

async function mustFind(tx: Database, id: string) {
  const [row] = await tx.select().from(changeRequests).where(eq(changeRequests.id, id)).for("update");
  if (!row) fail("That request doesn't exist.");
  return toRow(row);
}

const mayView = (actor: Actor, r: RequestRow) =>
  can(actor, "changeRequest:view", { authorId: r.authorId, practiceId: r.practiceId });

export interface RequestListItem extends RequestRow {
  authorName: string | null;
  practiceName: string;
}

async function withNames(
  db: Database,
  rows: (typeof changeRequests.$inferSelect)[],
): Promise<RequestListItem[]> {
  if (rows.length === 0) return [];
  const [people, practiceRows] = await Promise.all([
    db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(
        inArray(
          user.id,
          [...new Set(rows.map((r) => r.authorId).filter((x): x is string => Boolean(x)))].concat("-"),
        ),
      ),
    db.select({ id: practices.id, name: practices.name }).from(practices),
  ]);
  return rows.map((r) => ({
    ...toRow(r),
    authorName: people.find((p) => p.id === r.authorId)?.name ?? null,
    practiceName: practiceRows.find((p) => p.id === r.practiceId)?.name ?? "",
  }));
}

const pendingFirst = (a: RequestListItem, b: RequestListItem) =>
  Number(isPending(b.status)) - Number(isPending(a.status)) || b.createdAt.getTime() - a.createdAt.getTime();

/** What a person sees under Requests: the ones they sent, and (for leads) the ones waiting in their practices. */
export async function listRequests(db: Database, actor: Actor) {
  const mine = await db.select().from(changeRequests).where(eq(changeRequests.authorId, actor.userId));
  const practiceIds = actor.leadOf.map((p) => p.id);
  // the Site Lead sees every practice's requests (to step in in an emergency)
  const inbox = actor.siteLead
    ? await db.select().from(changeRequests)
    : practiceIds.length
      ? await db.select().from(changeRequests).where(inArray(changeRequests.practiceId, practiceIds))
      : [];
  const [mineNamed, inboxNamed] = await Promise.all([withNames(db, mine), withNames(db, inbox)]);
  return {
    mine: mineNamed.sort(pendingFirst),
    inbox: inboxNamed.sort(pendingFirst),
  };
}

export interface RequestDetail extends RequestListItem {
  decidedByName: string | null;
  comments: { id: string; authorId: string | null; authorName: string | null; body: string; at: Date }[];
  /** the audit rows this request produced when it was approved */
  applied: {
    action: string;
    entity: string;
    entityId: string;
    after: Record<string, unknown> | null;
    before: Record<string, unknown> | null;
    at: Date;
  }[];
}

/** One request with its thread and what it changed; null if it doesn't exist or this person may not see it. */
export async function loadRequest(db: Database, actor: Actor, id: string): Promise<RequestDetail | null> {
  const [row] = await db.select().from(changeRequests).where(eq(changeRequests.id, id));
  if (!row) return null;
  const [item] = await withNames(db, [row]);
  if (!mayView(actor, item)) return null;
  const [comments, applied, decider] = await Promise.all([
    db
      .select({
        id: changeRequestComments.id,
        authorId: changeRequestComments.authorId,
        authorName: user.name,
        body: changeRequestComments.body,
        at: changeRequestComments.at,
      })
      .from(changeRequestComments)
      .leftJoin(user, eq(user.id, changeRequestComments.authorId))
      .where(eq(changeRequestComments.requestId, id))
      .orderBy(changeRequestComments.at),
    db
      .select({
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        after: auditLog.after,
        before: auditLog.before,
        at: auditLog.at,
      })
      .from(auditLog)
      .where(
        and(eq(auditLog.changeRequestId, id), or(eq(auditLog.entity, "node"), eq(auditLog.entity, "edge"))),
      )
      .orderBy(auditLog.at),
    row.decidedBy
      ? db.select({ name: user.name }).from(user).where(eq(user.id, row.decidedBy))
      : Promise.resolve([]),
  ]);
  return {
    ...item,
    decidedByName: decider[0]?.name ?? null,
    comments,
    applied: applied as RequestDetail["applied"],
  };
}

// ---------------------------------------------------------------------------------------------------- the thread

/** Either side can comment while the request is pending. The author answering "needs information" reopens it. */
export async function addComment(db: Database, actor: Actor, requestId: string, body: string) {
  const text = body.trim();
  if (!text) fail("Write a comment first.");
  if (text.length > 2000) fail("A comment can be at most 2000 characters.");
  return db.transaction(async (tx) => {
    const r = await mustFind(tx, requestId);
    if (!mayView(actor, r)) throw new ForbiddenError();
    if (!isPending(r.status)) fail("This request has been decided; it can't be commented on any more.");
    await tx.insert(changeRequestComments).values({ requestId, authorId: actor.userId, body: text });
    if (r.status === "needs_info" && r.authorId === actor.userId) {
      await tx.update(changeRequests).set({ status: "open" }).where(eq(changeRequests.id, requestId));
      await audit(tx, actor, "update", requestId, { status: "needs_info" }, { status: "open" });
    }
  });
}

const reviewer = (actor: Actor, r: RequestRow) => {
  if (!can(actor, "changeRequest:review", { practiceId: r.practiceId })) throw new ForbiddenError();
};

/** The reviewer asks the author for more information: a comment, and the request waits ("needs information"). */
export async function requestInfo(db: Database, actor: Actor, requestId: string, question: string) {
  const text = question.trim();
  if (!text) fail("Say what you need to know.");
  return db.transaction(async (tx) => {
    const r = await mustFind(tx, requestId);
    reviewer(actor, r);
    if (!isPending(r.status)) fail("This request has already been decided.");
    await tx.insert(changeRequestComments).values({ requestId, authorId: actor.userId, body: text });
    if (r.status !== "needs_info") {
      await tx.update(changeRequests).set({ status: "needs_info" }).where(eq(changeRequests.id, requestId));
      await audit(tx, actor, "update", requestId, { status: r.status }, { status: "needs_info" });
    }
  });
}

/** Rejects with a reason the author will read. */
export async function rejectRequest(db: Database, actor: Actor, requestId: string, reason: string) {
  const text = reason.trim();
  if (!text) fail("Say why it is rejected: the author will read it.");
  return db.transaction(async (tx) => {
    const r = await mustFind(tx, requestId);
    reviewer(actor, r);
    if (!isPending(r.status)) fail("This request has already been decided.");
    await tx
      .update(changeRequests)
      .set({ status: "rejected", decidedBy: actor.userId, decidedAt: new Date(), decisionNote: text })
      .where(eq(changeRequests.id, requestId));
    await audit(tx, actor, "update", requestId, { status: r.status }, { status: "rejected", note: text });
  });
}

/** The author takes it back. */
export async function withdrawRequest(db: Database, actor: Actor, requestId: string) {
  return db.transaction(async (tx) => {
    const r = await mustFind(tx, requestId);
    if (!can(actor, "changeRequest:withdraw", { authorId: r.authorId })) throw new ForbiddenError();
    if (!isPending(r.status)) fail("This request has already been decided.");
    await tx.update(changeRequests).set({ status: "withdrawn" }).where(eq(changeRequests.id, requestId));
    await audit(tx, actor, "update", requestId, { status: r.status }, { status: "withdrawn" });
  });
}

// ---------------------------------------------------------------------------------------------------- approving

/** Applies one operation of a request as the reviewer. */
async function applyChange(tx: Database, ctx: EditContext, r: RequestRow, change: Change) {
  const subject = r.roleId;
  switch (change.op) {
    case "add_requirement": {
      const itemId =
        change.itemId ??
        (
          await createCatalogueItem(tx, ctx, {
            type: change.newItem!.type,
            name: change.newItem!.name,
            issuer: change.newItem!.issuer,
          })
        ).id;
      await addRequirement(tx, ctx, {
        ownerId: subject!,
        itemId,
        priority: change.priority,
        note: change.note,
      });
      return;
    }
    case "update_requirement":
      await updateRequirement(tx, ctx, {
        ownerId: subject!,
        itemId: change.itemId,
        priority: change.priority,
        note: change.note,
      });
      return;
    case "remove_requirement":
      await removeRequirement(tx, ctx, { ownerId: subject!, itemId: change.itemId });
      return;
    case "add_path":
      await addPath(tx, ctx, {
        fromId: subject!,
        toId: change.toId,
        note: change.note,
        typicalMonths: change.typicalMonths,
      });
      return;
    case "remove_path":
      await removePath(tx, ctx, { fromId: subject!, toId: change.toId });
      return;
    case "update_description":
      await updateRoleLike(tx, ctx, { id: subject!, description: change.description });
      return;
    case "propose_role":
      // a proposal becomes a draft for the Practice Lead to complete
      await createRole(tx, ctx, {
        practiceId: r.practiceId,
        name: change.name,
        description: change.description,
      });
      return;
    case "propose_specialization":
      await createSpecialization(tx, ctx, {
        roleId: subject!,
        name: change.name,
        description: change.description,
      });
      return;
  }
}

/**
 * Approves a request: re-checks every operation against the graph as it is now, applies them all in one transaction
 * (audit rows carry the request's id) and marks it approved. If anything no longer applies, nothing is changed and the
 * messages say which operation and why.
 */
export async function approveRequest(db: Database, actor: Actor, requestId: string, note?: string) {
  return db.transaction(async (tx) => {
    const r = await mustFind(tx, requestId);
    reviewer(actor, r);
    if (!isPending(r.status)) fail("This request has already been decided.");
    const graph = await loadGraph(tx);
    const problems = validateChanges(graph, { practiceId: r.practiceId, roleId: r.roleId }, r.changes);
    if (problems.length) fail(...problems.map((p) => `No longer applies: ${p}`));
    const ctx: EditContext = { actor, changeRequestId: r.id };
    for (const change of r.changes) await applyChange(tx, ctx, r, change);
    await tx
      .update(changeRequests)
      .set({
        status: "approved",
        decidedBy: actor.userId,
        decidedAt: new Date(),
        decisionNote: note?.trim() || null,
      })
      .where(eq(changeRequests.id, requestId));
    await audit(
      tx,
      actor,
      "update",
      requestId,
      { status: r.status },
      { status: "approved", operations: r.changes.length, note: note?.trim() || null },
    );
  });
}
