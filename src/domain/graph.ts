/**
 * The in-memory graph every domain function works on (docs/PLAN.md §4). Built once from the `nodes` and `edges` rows;
 * no framework or database imports here.
 */

export type NodeType = "role" | "specialization" | "technical_skill" | "soft_skill" | "certification";
export type CatalogueType = "technical_skill" | "soft_skill" | "certification";
export type Weight = "critical" | "important" | "nice";
export type EdgeKind = "requires" | "builds_on" | "related_to" | "next_step";

export const weights: readonly Weight[] = ["critical", "important", "nice"];
export const catalogueTypes: readonly CatalogueType[] = ["technical_skill", "soft_skill", "certification"];

export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  slug: string;
  category: string | null;
  practiceId: string | null;
  parentRoleId: string | null;
  status: "draft" | "published";
  issuer: string | null;
  /** What a role does, or what an item is; optional so fixtures can leave it out. */
  description?: string;
}

export interface GraphEdge {
  kind: EdgeKind;
  sourceId: string;
  targetId: string;
  priority: Weight | null;
  strength: number;
  note: string | null;
  typicalMonths: number | null;
}

export interface Graph {
  nodes: ReadonlyMap<string, GraphNode>;
  edges: readonly GraphEdge[];
  out: ReadonlyMap<string, readonly GraphEdge[]>;
  in: ReadonlyMap<string, readonly GraphEdge[]>;
  /** For each catalogue item: how many roles and specialisations require it (used to order learning). */
  demand: ReadonlyMap<string, number>;
}

/** A role, optionally narrowed to one of its specialisations. */
export interface Target {
  roleId: string;
  specializationId?: string | null;
}

export interface Requirement {
  item: GraphNode;
  weight: Weight;
  note: string | null;
  /** Whether the effective weight comes from the role's core or from the specialisation. */
  from: "core" | "specialization";
}

export const isCatalogue = (n: GraphNode) => (catalogueTypes as readonly string[]).includes(n.type);
export const isRoleLike = (n: GraphNode) => n.type === "role" || n.type === "specialization";

export function buildGraph(nodes: readonly GraphNode[], edges: readonly GraphEdge[]): Graph {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map<string, GraphEdge[]>();
  const into = new Map<string, GraphEdge[]>();
  const demand = new Map<string, number>();
  for (const e of edges) {
    if (!byId.has(e.sourceId) || !byId.has(e.targetId)) continue; // dangling: ignore rather than crash
    out.set(e.sourceId, [...(out.get(e.sourceId) ?? []), e]);
    into.set(e.targetId, [...(into.get(e.targetId) ?? []), e]);
    if (e.kind === "requires") demand.set(e.targetId, (demand.get(e.targetId) ?? 0) + 1);
  }
  return { nodes: byId, edges, out, in: into, demand };
}

export function node(graph: Graph, id: string): GraphNode {
  const found = graph.nodes.get(id);
  if (!found) throw new Error(`Unknown node ${id}`);
  return found;
}

export const outgoing = (graph: Graph, id: string, kind?: EdgeKind) =>
  (graph.out.get(id) ?? []).filter((e) => !kind || e.kind === kind);
export const incoming = (graph: Graph, id: string, kind?: EdgeKind) =>
  (graph.in.get(id) ?? []).filter((e) => !kind || e.kind === kind);

export function specializationsOf(graph: Graph, roleId: string, { includeDrafts = false } = {}) {
  return [...graph.nodes.values()]
    .filter((n) => n.type === "specialization" && n.parentRoleId === roleId)
    .filter((n) => includeDrafts || n.status === "published")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function roles(graph: Graph, { includeDrafts = false } = {}) {
  return [...graph.nodes.values()]
    .filter((n) => n.type === "role" && (includeDrafts || n.status === "published"))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Checks that the target names a role and, if given, one of that role's own specialisations. */
export function checkTarget(graph: Graph, target: Target) {
  const role = node(graph, target.roleId);
  if (role.type !== "role") throw new Error(`${role.name} is not a role`);
  if (!target.specializationId) return { role, specialization: null };
  const specialization = node(graph, target.specializationId);
  if (specialization.type !== "specialization" || specialization.parentRoleId !== role.id) {
    throw new Error(`${specialization.name} is not a specialisation of ${role.name}`);
  }
  return { role, specialization };
}

export function targetLabel(graph: Graph, target: Target) {
  const { role, specialization } = checkTarget(graph, target);
  return specialization ? `${role.name}: ${specialization.name}` : role.name;
}

const requiresFrom = (graph: Graph, sourceId: string) =>
  outgoing(graph, sourceId, "requires").map((e) => ({
    item: node(graph, e.targetId),
    weight: e.priority!,
    note: e.note,
  }));

/**
 * Effective requirements: the role's core plus the specialisation's own. Where both name the same item, the
 * specialisation's weight (and note) apply. Sorted by weight, then name.
 */
export function requirementsOf(graph: Graph, target: Target): Requirement[] {
  const { role, specialization } = checkTarget(graph, target);
  const result = new Map<string, Requirement>();
  for (const r of requiresFrom(graph, role.id)) result.set(r.item.id, { ...r, from: "core" });
  if (specialization) {
    for (const r of requiresFrom(graph, specialization.id)) {
      result.set(r.item.id, {
        ...r,
        note: r.note ?? result.get(r.item.id)?.note ?? null,
        from: "specialization",
      });
    }
  }
  return [...result.values()].sort(byWeightThenName);
}

export const weightRank = (w: Weight) => weights.indexOf(w);
export const byWeightThenName = (
  a: { weight: Weight; item: GraphNode },
  b: { weight: Weight; item: GraphNode },
) => weightRank(a.weight) - weightRank(b.weight) || a.item.name.localeCompare(b.item.name);

export function groupByWeight<T extends { weight: Weight }>(rows: readonly T[]): Record<Weight, T[]> {
  return {
    critical: rows.filter((r) => r.weight === "critical"),
    important: rows.filter((r) => r.weight === "important"),
    nice: rows.filter((r) => r.weight === "nice"),
  };
}

export function groupByType<T extends { item: GraphNode }>(rows: readonly T[]): Record<CatalogueType, T[]> {
  return {
    technical_skill: rows.filter((r) => r.item.type === "technical_skill"),
    soft_skill: rows.filter((r) => r.item.type === "soft_skill"),
    certification: rows.filter((r) => r.item.type === "certification"),
  };
}
