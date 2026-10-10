/**
 * Every change to the graph that a person makes: roles, specialisations, requirements, paths and catalogue items
 * (docs/PLAN.md §3 and §4). Each function checks the permission and the rules, writes, and appends an audit row in the
 * same transaction, so a refused or failed change leaves nothing behind. M10 applies approved change requests through
 * the same functions (`changeRequestId` links the audit rows to the request).
 */
import { and, eq, inArray, or } from "drizzle-orm";
import { can, type Actor } from "../domain/access";
import {
  canEditNode,
  catalogueItem,
  checkNewItem,
  checkNewRole,
  checkNewSpecialization,
  checkText,
  isEmergencyEdit,
  practiceIdOf,
  roleLike,
  roleSlug,
  specSlug,
} from "../domain/editing";
import { node as nodeOf, outgoing, type Graph, type GraphNode, type Weight } from "../domain/graph";
import { normalizeName, slugify } from "../domain/names";
import { checkLink, impactOfDeleting } from "../domain/validate";
import type { Database } from "./database";
import { loadGraph } from "./graph";
import { auditLog, edges, nodes, practices, profiles } from "./schema";

/** The change breaks a rule: the messages say what to fix. */
export class EditError extends Error {
  constructor(public problems: string[]) {
    super(problems.join(" "));
  }
}
/** The person may not make this change. */
export class ForbiddenError extends Error {
  constructor(message = "You are not allowed to change this.") {
    super(message);
  }
}

export interface EditContext {
  actor: Actor;
  /** set when the change applies an approved change request (M10) */
  changeRequestId?: string | null;
}

const inTx = <T>(db: Database, fn: (tx: Database, graph: Graph) => Promise<T>): Promise<T> =>
  db.transaction(async (tx) => fn(tx, await loadGraph(tx)));

const fail = (...problems: string[]) => {
  if (problems.length) throw new EditError(problems);
};

const snapshot = (n: GraphNode) => ({
  type: n.type,
  name: n.name,
  slug: n.slug,
  status: n.status,
  description: n.description ?? "",
  category: n.category,
  issuer: n.issuer,
  practiceId: n.practiceId,
  parentRoleId: n.parentRoleId,
});

type Json = Record<string, unknown>;

async function audit(
  tx: Database,
  ctx: EditContext,
  entry: {
    action: "create" | "update" | "delete";
    entity: "node" | "edge";
    entityId: string;
    before?: Json;
    after?: Json;
    /** the role the change is about, so a role's history can be listed */
    roleId?: string | null;
    emergency?: boolean;
  },
) {
  const meta = {
    ...(entry.roleId ? { roleId: entry.roleId } : {}),
    ...(entry.emergency ? { emergency: true } : {}),
  };
  await tx.insert(auditLog).values({
    actorId: ctx.actor.userId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    before: entry.before ? { ...entry.before, ...meta } : null,
    after: entry.after ? { ...entry.after, ...meta } : null,
    changeRequestId: ctx.changeRequestId ?? null,
  });
}

/** The role (or the role of a specialisation) a node's history is filed under. */
const roleIdFor = (graph: Graph, n: GraphNode) => (n.type === "specialization" ? n.parentRoleId : n.id);

/** Checks that the person may edit this role or specialisation; returns it and whether it is an emergency edit. */
function editable(ctx: EditContext, graph: Graph, id: string) {
  const n = roleLike(graph, id);
  if (!n) throw new EditError(["That role or specialisation doesn't exist."]);
  if (!canEditNode(ctx.actor, graph, id)) throw new ForbiddenError();
  return { n, emergency: isEmergencyEdit(ctx.actor, practiceIdOf(graph, id)!) };
}

const cleanNote = (note?: string | null) => note?.trim() || null;

// ---------------------------------------------------------------------------------------------------- roles

/** A new role in a practice, as a draft: only Practice Leads see it until it is published. */
export async function createRole(
  db: Database,
  ctx: EditContext,
  input: { practiceId: string; name: string; description: string },
) {
  return inTx(db, async (tx, graph) => {
    if (!can(ctx.actor, "role:edit", { practiceId: input.practiceId })) throw new ForbiddenError();
    const [practice] = await tx
      .select({ id: practices.id })
      .from(practices)
      .where(eq(practices.id, input.practiceId));
    if (!practice) throw new EditError(["That practice doesn't exist."]);
    fail(...checkNewRole(graph, input.name, input.description));
    const name = input.name.trim();
    const [row] = await tx
      .insert(nodes)
      .values({
        type: "role",
        name,
        slug: roleSlug(graph, name),
        normalizedName: normalizeName(name),
        description: input.description.trim(),
        practiceId: input.practiceId,
        status: "draft",
      })
      .returning();
    await audit(tx, ctx, {
      action: "create",
      entity: "node",
      entityId: row.id,
      after: { ...snapshot({ ...row, description: row.description } as GraphNode) },
      roleId: row.id,
      emergency: isEmergencyEdit(ctx.actor, input.practiceId),
    });
    return row;
  });
}

/** A new specialisation of a role, as a draft. */
export async function createSpecialization(
  db: Database,
  ctx: EditContext,
  input: { roleId: string; name: string; description: string },
) {
  return inTx(db, async (tx, graph) => {
    const { n: role, emergency } = editable(ctx, graph, input.roleId);
    fail(...checkNewSpecialization(graph, role, input.name, input.description));
    const name = input.name.trim();
    const [row] = await tx
      .insert(nodes)
      .values({
        type: "specialization",
        name,
        slug: specSlug(graph, role.name, name),
        normalizedName: normalizeName(name),
        description: input.description.trim(),
        parentRoleId: role.id,
        status: "draft",
      })
      .returning();
    await audit(tx, ctx, {
      action: "create",
      entity: "node",
      entityId: row.id,
      after: snapshot({ ...row, description: row.description } as GraphNode),
      roleId: role.id,
      emergency,
    });
    return row;
  });
}

/** Changes the name and/or description of a role or specialisation (its address stays the same). */
export async function updateRoleLike(
  db: Database,
  ctx: EditContext,
  input: { id: string; name?: string; description?: string },
) {
  return inTx(db, async (tx, graph) => {
    const { n, emergency } = editable(ctx, graph, input.id);
    const name = input.name?.trim() ?? n.name;
    const description = input.description?.trim() ?? n.description ?? "";
    fail(...checkText(name, description));
    if (!description) fail("A role needs a description.");
    if (name !== n.name) {
      const key = normalizeName(name);
      const clash = [...graph.nodes.values()].find(
        (o) =>
          o.id !== n.id &&
          normalizeName(o.name) === key &&
          (n.type === "specialization"
            ? o.type === "specialization" && o.parentRoleId === n.parentRoleId
            : o.type !== "specialization"),
      );
      if (clash) fail(`"${name}" already exists.`);
    }
    if (name === n.name && description === (n.description ?? "")) return n;
    await tx
      .update(nodes)
      .set({ name, normalizedName: normalizeName(name), description })
      .where(eq(nodes.id, n.id));
    await audit(tx, ctx, {
      action: "update",
      entity: "node",
      entityId: n.id,
      before: snapshot(n),
      after: snapshot({ ...n, name, description }),
      roleId: roleIdFor(graph, n),
      emergency,
    });
    return { ...n, name, description };
  });
}

/** Makes a draft visible to everyone. A specialisation can only be published once its role is. */
export async function publishRoleLike(db: Database, ctx: EditContext, id: string) {
  return inTx(db, async (tx, graph) => {
    const { n, emergency } = editable(ctx, graph, id);
    if (n.status === "published") return n;
    if (n.type === "specialization" && nodeOf(graph, n.parentRoleId!).status !== "published") {
      fail(`Publish ${nodeOf(graph, n.parentRoleId!).name} first.`);
    }
    if (outgoing(graph, n.id, "requires").length === 0 && n.type === "role") {
      fail("A role needs at least one requirement before it is published.");
    }
    await tx.update(nodes).set({ status: "published" }).where(eq(nodes.id, n.id));
    await audit(tx, ctx, {
      action: "update",
      entity: "node",
      entityId: n.id,
      before: { type: n.type, status: "draft", name: n.name },
      after: { type: n.type, status: "published", name: n.name },
      roleId: roleIdFor(graph, n),
      emergency,
    });
    return { ...n, status: "published" as const };
  });
}

export interface DeletionImpact {
  links: number;
  requiredBy: string[];
  specializations: string[];
  /** people who have this role (or a specialisation of it) as their current role or target */
  people: number;
}

/** What deleting a role or specialisation would take with it: shown before the person confirms. */
export async function deletionImpact(db: Database, id: string): Promise<DeletionImpact> {
  const graph = await loadGraph(db);
  const impact = impactOfDeleting(graph, id);
  const ids = [id, ...[...graph.nodes.values()].filter((n) => n.parentRoleId === id).map((n) => n.id)];
  const people = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(
      or(
        inArray(profiles.currentRoleId, ids),
        inArray(profiles.currentSpecializationId, ids),
        inArray(profiles.targetRoleId, ids),
        inArray(profiles.targetSpecializationId, ids),
      ),
    );
  return { ...impact, people: people.length };
}

/** Deletes a role (with its specialisations and links) or a specialisation. The audit row keeps what it was. */
export async function deleteRoleLike(db: Database, ctx: EditContext, id: string) {
  return inTx(db, async (tx, graph) => {
    const { n, emergency } = editable(ctx, graph, id);
    const impact = impactOfDeleting(graph, id);
    await tx.delete(nodes).where(eq(nodes.id, n.id)); // specialisations and links go with it (foreign keys)
    await audit(tx, ctx, {
      action: "delete",
      entity: "node",
      entityId: n.id,
      before: { ...snapshot(n), links: impact.links, specializations: impact.specializations },
      roleId: roleIdFor(graph, n),
      emergency,
    });
  });
}

// ---------------------------------------------------------------------------------------------------- requirements

const edgeSnapshot = (
  graph: Graph,
  e: {
    kind: string;
    sourceId: string;
    targetId: string;
    priority: string | null;
    note: string | null;
    typicalMonths: number | null;
  },
) => ({
  kind: e.kind,
  source: nodeOf(graph, e.sourceId).name,
  target: nodeOf(graph, e.targetId).name,
  sourceId: e.sourceId,
  targetId: e.targetId,
  priority: e.priority,
  note: e.note,
  typicalMonths: e.typicalMonths,
});

export async function addRequirement(
  db: Database,
  ctx: EditContext,
  input: { ownerId: string; itemId: string; priority: Weight; note?: string | null },
) {
  return inTx(db, async (tx, graph) => {
    const { n: owner, emergency } = editable(ctx, graph, input.ownerId);
    if (!catalogueItem(graph, input.itemId))
      fail("A requirement must be a skill or certification from the catalogue.");
    const { problems } = checkLink(graph, {
      kind: "requires",
      sourceId: owner.id,
      targetId: input.itemId,
      priority: input.priority,
    });
    fail(...problems);
    const note = cleanNote(input.note);
    const [edge] = await tx
      .insert(edges)
      .values({
        kind: "requires",
        sourceId: owner.id,
        targetId: input.itemId,
        priority: input.priority,
        note,
      })
      .returning();
    await audit(tx, ctx, {
      action: "create",
      entity: "edge",
      entityId: edge.id,
      after: edgeSnapshot(graph, edge),
      roleId: roleIdFor(graph, owner),
      emergency,
    });
    return edge;
  });
}

const findEdge = (graph: Graph, kind: "requires" | "next_step", sourceId: string, targetId: string) =>
  outgoing(graph, sourceId, kind).find((e) => e.targetId === targetId);

async function edgeRow(tx: Database, kind: "requires" | "next_step", sourceId: string, targetId: string) {
  const [row] = await tx
    .select()
    .from(edges)
    .where(and(eq(edges.kind, kind), eq(edges.sourceId, sourceId), eq(edges.targetId, targetId)));
  return row;
}

export async function updateRequirement(
  db: Database,
  ctx: EditContext,
  input: { ownerId: string; itemId: string; priority?: Weight; note?: string | null },
) {
  return inTx(db, async (tx, graph) => {
    const { n: owner, emergency } = editable(ctx, graph, input.ownerId);
    if (!findEdge(graph, "requires", owner.id, input.itemId))
      fail(`${owner.name} doesn't require that item.`);
    const before = await edgeRow(tx, "requires", owner.id, input.itemId);
    const priority = input.priority ?? before.priority!;
    const note = input.note === undefined ? before.note : cleanNote(input.note);
    if (priority === before.priority && note === before.note) return before;
    const [after] = await tx.update(edges).set({ priority, note }).where(eq(edges.id, before.id)).returning();
    await audit(tx, ctx, {
      action: "update",
      entity: "edge",
      entityId: before.id,
      before: edgeSnapshot(graph, before),
      after: edgeSnapshot(graph, after),
      roleId: roleIdFor(graph, owner),
      emergency,
    });
    return after;
  });
}

export async function removeRequirement(
  db: Database,
  ctx: EditContext,
  input: { ownerId: string; itemId: string },
) {
  return inTx(db, async (tx, graph) => {
    const { n: owner, emergency } = editable(ctx, graph, input.ownerId);
    if (!findEdge(graph, "requires", owner.id, input.itemId))
      fail(`${owner.name} doesn't require that item.`);
    const before = await edgeRow(tx, "requires", owner.id, input.itemId);
    await tx.delete(edges).where(eq(edges.id, before.id));
    await audit(tx, ctx, {
      action: "delete",
      entity: "edge",
      entityId: before.id,
      before: edgeSnapshot(graph, before),
      roleId: roleIdFor(graph, owner),
      emergency,
    });
  });
}

// ---------------------------------------------------------------------------------------------------- paths

/** An official career move from a role or specialisation to another. */
export async function addPath(
  db: Database,
  ctx: EditContext,
  input: { fromId: string; toId: string; note?: string | null; typicalMonths?: number | null },
) {
  return inTx(db, async (tx, graph) => {
    const { n: from, emergency } = editable(ctx, graph, input.fromId);
    const to = roleLike(graph, input.toId);
    if (!to) fail("A path must lead to a role or specialisation that exists.");
    if (to!.status !== "published") fail("A path can only lead to a published role or specialisation.");
    const months = input.typicalMonths ?? null;
    if (months !== null && (!Number.isInteger(months) || months < 1 || months > 120))
      fail("Typical months must be a whole number from 1 to 120.");
    fail(...checkLink(graph, { kind: "next_step", sourceId: from.id, targetId: to!.id }).problems);
    const [edge] = await tx
      .insert(edges)
      .values({
        kind: "next_step",
        sourceId: from.id,
        targetId: to!.id,
        note: cleanNote(input.note),
        typicalMonths: months,
      })
      .returning();
    await audit(tx, ctx, {
      action: "create",
      entity: "edge",
      entityId: edge.id,
      after: edgeSnapshot(graph, edge),
      roleId: roleIdFor(graph, from),
      emergency,
    });
    return edge;
  });
}

export async function removePath(db: Database, ctx: EditContext, input: { fromId: string; toId: string }) {
  return inTx(db, async (tx, graph) => {
    const { n: from, emergency } = editable(ctx, graph, input.fromId);
    if (!findEdge(graph, "next_step", from.id, input.toId))
      fail(`There is no path from ${from.name} to that role.`);
    const before = await edgeRow(tx, "next_step", from.id, input.toId);
    await tx.delete(edges).where(eq(edges.id, before.id));
    await audit(tx, ctx, {
      action: "delete",
      entity: "edge",
      entityId: before.id,
      before: edgeSnapshot(graph, before),
      roleId: roleIdFor(graph, from),
      emergency,
    });
  });
}

// ---------------------------------------------------------------------------------------------------- catalogue

/** A new skill or certification for the shared catalogue. A name that already exists (ignoring case and punctuation) is refused. */
export async function createCatalogueItem(
  db: Database,
  ctx: EditContext,
  input: {
    type: string;
    name: string;
    category?: string | null;
    issuer?: string | null;
    description?: string;
  },
) {
  return inTx(db, async (tx, graph) => {
    if (!can(ctx.actor, "catalogue:add")) throw new ForbiddenError();
    fail(...checkNewItem(graph, input));
    const name = input.name.trim();
    const taken = new Set([...graph.nodes.values()].map((n) => n.slug));
    let slug = slugify(name);
    for (let i = 2; taken.has(slug); i++) slug = `${slugify(name)}-${i}`;
    const [row] = await tx
      .insert(nodes)
      .values({
        type: input.type as "technical_skill" | "soft_skill" | "certification",
        name,
        slug,
        normalizedName: normalizeName(name),
        description: input.description?.trim() ?? "",
        category: input.category?.trim() || null,
        issuer: input.type === "certification" ? input.issuer?.trim() || null : null,
        status: "published",
      })
      .returning();
    await audit(tx, ctx, {
      action: "create",
      entity: "node",
      entityId: row.id,
      after: snapshot(row as unknown as GraphNode),
    });
    return row;
  });
}
