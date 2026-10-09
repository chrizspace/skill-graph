import { assess, readiness } from "./assess";
import { thresholds } from "./config";
import { node, targetLabel, type Graph, type GraphNode, type Target, type Weight } from "./graph";
import type { Profile } from "./profile";

export interface Person {
  id: string;
  practiceId?: string | null;
  profile: Profile;
}

export interface ItemGap {
  item: GraphNode;
  /** The people for whom this item is a gap, for their current role or their target. */
  people: string[];
}

/**
 * Team and practice gaps (docs/PLAN.md §4 "Aggregates"): for each item, who misses it as a Critical or Important
 * requirement of their current role or their target. Most common gaps first.
 */
export function gapsAcross(
  graph: Graph,
  people: readonly Person[],
  today: Date | string,
  { weights = ["critical", "important"] as Weight[] } = {},
): ItemGap[] {
  const byItem = new Map<string, Set<string>>();
  for (const p of people) {
    for (const t of [p.profile.current, p.profile.target]) {
      if (!t) continue;
      for (const r of assess(graph, p.profile, t, today).missing) {
        if (!weights.includes(r.weight)) continue;
        byItem.set(r.item.id, (byItem.get(r.item.id) ?? new Set()).add(p.id));
      }
    }
  }
  return [...byItem]
    .map(([id, who]) => ({ item: node(graph, id), people: [...who].sort() }))
    .sort((a, b) => b.people.length - a.people.length || a.item.name.localeCompare(b.item.name));
}

/** Succession: everyone's readiness for a target, closest first. */
export function closestTo(graph: Graph, people: readonly Person[], target: Target) {
  return people
    .map((p) => ({ personId: p.id, readiness: readiness(graph, p.profile, target) }))
    .sort((a, b) => b.readiness.score - a.readiness.score || a.personId.localeCompare(b.personId));
}

export interface Bench {
  target: Target;
  label: string;
  reachable: number;
  stretch: number;
}

/** Bench strength: per target, how many people are reachable or a stretch away (counts only, no names). */
export function benchStrength(graph: Graph, people: readonly Person[], targets: readonly Target[]): Bench[] {
  return targets.map((target) => {
    const bands = people.map((p) => readiness(graph, p.profile, target).band);
    return {
      target,
      label: targetLabel(graph, target),
      reachable: bands.filter((b) => b === "reachable").length,
      stretch: bands.filter((b) => b === "stretch").length,
    };
  });
}

export interface Group<T> {
  key: string;
  size: number;
  /** Fewer people than `min`: the value is withheld so nobody can be singled out. */
  hidden: boolean;
  value: T | null;
}

/** Computes a value per group of people, hiding groups smaller than `min` (Site Lead views, docs/PLAN.md §1). */
export function aggregateByGroup<T>(
  groups: ReadonlyMap<string, readonly Person[]>,
  compute: (people: readonly Person[]) => T,
  min: number = thresholds.minGroupSize,
): Group<T>[] {
  return [...groups].map(([key, people]) => {
    const hidden = people.length < min;
    return { key, size: people.length, hidden, value: hidden ? null : compute(people) };
  });
}
