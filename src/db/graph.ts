import { eq } from "drizzle-orm";
import { buildGraph, type Graph } from "../domain/graph";
import type { Profile } from "../domain/profile";
import type { Database } from "./database";
import { edges, nodes, profileItems, profiles } from "./schema";

/** The whole graph in memory (docs/PLAN.md §2: ~22k rows at full scale). Callers cache it; writes invalidate it. */
export async function loadGraph(db: Database): Promise<Graph> {
  const [nodeRows, edgeRows] = await Promise.all([
    db
      .select({
        id: nodes.id,
        type: nodes.type,
        name: nodes.name,
        slug: nodes.slug,
        category: nodes.category,
        practiceId: nodes.practiceId,
        parentRoleId: nodes.parentRoleId,
        status: nodes.status,
        issuer: nodes.issuer,
      })
      .from(nodes),
    db
      .select({
        kind: edges.kind,
        sourceId: edges.sourceId,
        targetId: edges.targetId,
        priority: edges.priority,
        strength: edges.strength,
        note: edges.note,
        typicalMonths: edges.typicalMonths,
      })
      .from(edges),
  ]);
  return buildGraph(nodeRows, edgeRows);
}

/** A person's profile for the domain functions, or null if they have none. */
export async function loadProfile(db: Database, userId: string): Promise<Profile | null> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  if (!profile) return null;
  const items = await db
    .select({
      nodeId: profileItems.nodeId,
      obtainedOn: profileItems.obtainedOn,
      expiresOn: profileItems.expiresOn,
    })
    .from(profileItems)
    .where(eq(profileItems.userId, userId));
  const target = (roleId: string | null, specializationId: string | null) =>
    roleId ? { roleId, specializationId } : null;
  return {
    items,
    current: target(profile.currentRoleId, profile.currentSpecializationId),
    target: target(profile.targetRoleId, profile.targetSpecializationId),
  };
}
