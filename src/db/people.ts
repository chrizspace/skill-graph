/**
 * People for the manager and Practice Lead views (docs/PLAN.md §1, §5): profiles loaded in bulk, who someone's manager
 * and practice are (for `can()`), and a manager's recommendations. Nothing here decides who may see whom: pages and
 * actions check `can(actor, "profile:view" | "recommendation:create", …)` first.
 */
import { and, eq, inArray } from "drizzle-orm";
import { can, type Actor, type PersonRef } from "../domain/access";
import type { Person } from "../domain/aggregates";
import type { Target } from "../domain/graph";
import { isCatalogue, isRoleLike } from "../domain/graph";
import { validTarget } from "../domain/profile-input";
import type { Database } from "./database";
import { loadGraph } from "./graph";
import { EditError, ForbiddenError } from "./graph-write";
import { auditLog, profileItems, profiles, recommendations, user } from "./schema";

export interface PersonData extends Person {
  name: string;
  email: string;
  managerId: string | null;
}

/** The profiles of these people (those who have one), in one go. */
export async function loadPeople(db: Database, userIds: readonly string[]): Promise<PersonData[]> {
  if (userIds.length === 0) return [];
  const [rows, items] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        practiceId: profiles.practiceId,
        managerId: profiles.managerId,
        roleId: profiles.currentRoleId,
        specId: profiles.currentSpecializationId,
        targetRoleId: profiles.targetRoleId,
        targetSpecId: profiles.targetSpecializationId,
      })
      .from(profiles)
      .innerJoin(user, eq(user.id, profiles.userId))
      .where(inArray(profiles.userId, [...userIds])),
    db
      .select({
        userId: profileItems.userId,
        nodeId: profileItems.nodeId,
        obtainedOn: profileItems.obtainedOn,
        expiresOn: profileItems.expiresOn,
      })
      .from(profileItems)
      .where(inArray(profileItems.userId, [...userIds])),
  ]);
  const target = (roleId: string | null, specializationId: string | null): Target | null =>
    roleId ? { roleId, specializationId } : null;
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      practiceId: r.practiceId,
      managerId: r.managerId,
      profile: {
        items: items
          .filter((i) => i.userId === r.id)
          .map((i) => ({ nodeId: i.nodeId, obtainedOn: i.obtainedOn, expiresOn: i.expiresOn })),
        current: target(r.roleId, r.specId),
        target: target(r.targetRoleId, r.targetSpecId),
      },
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function directReportIds(db: Database, managerId: string) {
  const rows = await db
    .select({ id: profiles.userId })
    .from(profiles)
    .where(eq(profiles.managerId, managerId));
  return rows.map((r) => r.id);
}

export async function memberIds(db: Database, practiceId: string) {
  const rows = await db
    .select({ id: profiles.userId })
    .from(profiles)
    .where(eq(profiles.practiceId, practiceId));
  return rows.map((r) => r.id);
}

/** What `can()` needs to know about a person: who they are, who manages them, which practice they belong to. */
export async function personRef(db: Database, userId: string): Promise<PersonRef | null> {
  const [row] = await db
    .select({ id: profiles.userId, managerId: profiles.managerId, practiceId: profiles.practiceId })
    .from(profiles)
    .where(eq(profiles.userId, userId));
  return row ?? null;
}

export interface SentRecommendation {
  id: string;
  nodeId: string;
  comment: string;
  status: "open" | "accepted" | "declined";
  createdAt: Date;
}

/** The recommendations an author has made to a person. */
export async function sentRecommendations(
  db: Database,
  personId: string,
  authorId: string,
): Promise<SentRecommendation[]> {
  return db
    .select({
      id: recommendations.id,
      nodeId: recommendations.nodeId,
      comment: recommendations.comment,
      status: recommendations.status,
      createdAt: recommendations.createdAt,
    })
    .from(recommendations)
    .where(and(eq(recommendations.personId, personId), eq(recommendations.authorId, authorId)))
    .orderBy(recommendations.createdAt);
}

/**
 * A manager recommends a development step to a direct report: a target (a role or specialisation) or a skill or
 * certification to work on, with a comment. The report accepts or declines it in their plan.
 */
export async function createRecommendation(
  db: Database,
  actor: Actor,
  input: { personId: string; nodeId: string; comment: string },
) {
  const ref = await personRef(db, input.personId);
  if (!ref || !can(actor, "recommendation:create", ref)) throw new ForbiddenError();
  const comment = input.comment.trim();
  if (!comment) throw new EditError(["Say why: the comment is what they read first."]);
  if (comment.length > 1000) throw new EditError(["The comment can be at most 1000 characters."]);

  return db.transaction(async (tx) => {
    const graph = await loadGraph(tx);
    const node = graph.nodes.get(input.nodeId);
    if (!node || node.status !== "published" || !(isRoleLike(node) || isCatalogue(node))) {
      throw new EditError(["Choose a role, a specialisation, a skill or a certification."]);
    }
    const [person] = await loadPeople(tx, [input.personId]);
    if (isRoleLike(node)) {
      const target = validTarget(
        graph,
        node.type === "specialization" ? node.parentRoleId! : node.id,
        node.type === "specialization" ? node.id : null,
      );
      const current = person.profile.current;
      if (!target) throw new EditError(["That isn't a role they can aim for."]);
      if (
        current &&
        current.roleId === target.roleId &&
        (current.specializationId ?? null) === (target.specializationId ?? null)
      ) {
        throw new EditError(["That is already their role."]);
      }
    } else if (person.profile.items.some((i) => i.nodeId === node.id)) {
      throw new EditError([`${person.name} already has ${node.name}.`]);
    }
    const open = await tx
      .select({ id: recommendations.id })
      .from(recommendations)
      .where(
        and(
          eq(recommendations.personId, input.personId),
          eq(recommendations.nodeId, node.id),
          eq(recommendations.status, "open"),
        ),
      );
    if (open.length) throw new EditError([`${node.name} is already waiting for ${person.name}'s answer.`]);

    const [row] = await tx
      .insert(recommendations)
      .values({ personId: input.personId, authorId: actor.userId, nodeId: node.id, comment })
      .returning();
    await tx.insert(auditLog).values({
      actorId: actor.userId,
      action: "create",
      entity: "recommendation",
      entityId: row.id,
      after: {
        person: person.name,
        node: node.name,
        comment,
        summary: `recommended “${node.name}” to ${person.name}`,
      },
    });
    return row;
  });
}
