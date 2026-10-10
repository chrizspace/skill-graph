import { eq } from "drizzle-orm";
import { buildGraph, type Graph } from "../domain/graph";
import type { Profile } from "../domain/profile";
import type { Database } from "./database";
import {
  edges,
  nodes,
  practiceLeads,
  practices,
  profileItems,
  profiles,
  recommendations,
  user,
} from "./schema";

/** The rows of the whole graph: plain data, so the app can cache them (src/lib/graph-data.ts). */
export async function loadGraphRows(db: Database) {
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
        description: nodes.description,
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
  return { nodes: nodeRows, edges: edgeRows };
}

/** The whole graph in memory (docs/PLAN.md §2: ~22k rows at full scale). Callers cache it; writes invalidate it. */
export async function loadGraph(db: Database): Promise<Graph> {
  const { nodes, edges } = await loadGraphRows(db);
  return buildGraph(nodes, edges);
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

export interface PracticeInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  leads: string[];
}

/** The site's practices with the names of their Practice Leads. */
export async function loadPractices(db: Database): Promise<PracticeInfo[]> {
  const [rows, leads] = await Promise.all([
    db
      .select({
        id: practices.id,
        slug: practices.slug,
        name: practices.name,
        description: practices.description,
      })
      .from(practices)
      .orderBy(practices.name),
    db
      .select({ practiceId: practiceLeads.practiceId, name: user.name })
      .from(practiceLeads)
      .innerJoin(user, eq(user.id, practiceLeads.userId))
      .orderBy(user.name),
  ]);
  return rows.map((p) => ({
    ...p,
    leads: leads.filter((l) => l.practiceId === p.id).map((l) => l.name),
  }));
}

export interface MyProfile {
  profile: Profile;
  practiceId: string | null;
}

/** Profile data for the pages: the domain profile plus the home practice. Null when the person has no profile yet. */
export async function loadMyProfile(db: Database, userId: string): Promise<MyProfile | null> {
  const profile = await loadProfile(db, userId);
  if (!profile) return null;
  const [row] = await db
    .select({ practiceId: profiles.practiceId })
    .from(profiles)
    .where(eq(profiles.userId, userId));
  return { profile, practiceId: row?.practiceId ?? null };
}

export interface MyRecommendation {
  id: string;
  nodeId: string;
  comment: string;
  status: "open" | "accepted" | "declined";
  author: string | null;
}

export async function loadRecommendations(db: Database, userId: string): Promise<MyRecommendation[]> {
  const rows = await db
    .select({
      id: recommendations.id,
      nodeId: recommendations.nodeId,
      comment: recommendations.comment,
      status: recommendations.status,
      author: user.name,
    })
    .from(recommendations)
    .leftJoin(user, eq(user.id, recommendations.authorId))
    .where(eq(recommendations.personId, userId))
    .orderBy(recommendations.createdAt);
  return rows;
}
