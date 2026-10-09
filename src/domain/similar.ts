import { thresholds, weightValue } from "./config";
import { node, outgoing, roles, weightRank, type Graph, type GraphNode, type Weight } from "./graph";

export interface SimilarRole {
  role: GraphNode;
  /** Weighted Jaccard index of the two roles' core requirements, 0–1. */
  score: number;
  /** The synergies: items both roles require, with each role's weight. */
  shared: { item: GraphNode; weightThis: Weight; weightOther: Weight }[];
  onlyThis: { item: GraphNode; weight: Weight }[];
  onlyOther: { item: GraphNode; weight: Weight }[];
}

const core = (graph: Graph, roleId: string) =>
  new Map(outgoing(graph, roleId, "requires").map((e) => [e.targetId, e.priority!]));

/** Σ min(wA, wB) / Σ max(wA, wB) over every item either role's core requires (weights 3 / 2 / 1, 0 if absent). */
export function similarity(graph: Graph, roleA: string, roleB: string) {
  const a = core(graph, roleA);
  const b = core(graph, roleB);
  let min = 0;
  let max = 0;
  for (const id of new Set([...a.keys(), ...b.keys()])) {
    const wa = a.has(id) ? weightValue[a.get(id)!] : 0;
    const wb = b.has(id) ? weightValue[b.get(id)!] : 0;
    min += Math.min(wa, wb);
    max += Math.max(wa, wb);
  }
  return max === 0 ? 0 : min / max;
}

/** Published roles whose core requirements overlap this role's, most similar first (docs/PLAN.md §4). */
export function similarRoles(
  graph: Graph,
  roleId: string,
  { limit = 5, threshold = thresholds.similarity }: { limit?: number; threshold?: number } = {},
): SimilarRole[] {
  const mine = core(graph, roleId);
  const byWeight = <T extends { weight: Weight; item: GraphNode }>(x: T, y: T) =>
    weightRank(x.weight) - weightRank(y.weight) || x.item.name.localeCompare(y.item.name);
  return roles(graph)
    .filter((r) => r.id !== roleId)
    .map((other) => ({ other, score: similarity(graph, roleId, other.id) }))
    .filter((s) => s.score >= threshold)
    .sort((x, y) => y.score - x.score || x.other.name.localeCompare(y.other.name))
    .slice(0, limit)
    .map(({ other, score }) => {
      const theirs = core(graph, other.id);
      return {
        role: other,
        score,
        shared: [...mine]
          .filter(([id]) => theirs.has(id))
          .map(([id, w]) => ({
            item: node(graph, id),
            weightThis: w,
            weightOther: theirs.get(id)!,
            weight: w,
          }))
          .sort(byWeight)
          .map(({ item, weightThis, weightOther }) => ({ item, weightThis, weightOther })),
        onlyThis: [...mine]
          .filter(([id]) => !theirs.has(id))
          .map(([id, weight]) => ({ item: node(graph, id), weight }))
          .sort(byWeight),
        onlyOther: [...theirs]
          .filter(([id]) => !mine.has(id))
          .map(([id, weight]) => ({ item: node(graph, id), weight }))
          .sort(byWeight),
      };
    });
}
