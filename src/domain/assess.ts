import { thresholds, weightValue } from "./config";
import {
  outgoing,
  requirementsOf,
  weightRank,
  weights,
  type Graph,
  type GraphNode,
  type Requirement,
  type Target,
  type Weight,
} from "./graph";
import { certificationStatus, holdings, type CertificationStatus, type Profile } from "./profile";

export interface AssessedItem extends Requirement {
  /** For certifications the person holds: valid, expiring or expired (expired still counts as met). */
  certification?: CertificationStatus;
}

export type Band = "reachable" | "stretch" | "far";

export interface Readiness {
  /** Σ weight of met requirements / Σ weight of all requirements, 0–1. A target without requirements scores 1. */
  score: number;
  criticalMet: boolean;
  band: Band;
}

export interface Assessment {
  target: Target;
  met: AssessedItem[];
  /** In learning order (see `learningOrder`). */
  missing: AssessedItem[];
  readiness: Readiness;
}

/**
 * How a profile meets a target: every requirement is met (the person has the skill or holds the certification,
 * expired included) or missing.
 */
export function assess(graph: Graph, profile: Profile, target: Target, today: Date | string): Assessment {
  const held = holdings(profile);
  const met: AssessedItem[] = [];
  const missing: AssessedItem[] = [];
  for (const r of requirementsOf(graph, target)) {
    const h = held.get(r.item.id);
    if (!h) missing.push(r);
    else
      met.push(r.item.type === "certification" ? { ...r, certification: certificationStatus(h, today) } : r);
  }
  return { target, met, missing: learningOrder(graph, missing), readiness: readinessOf(met, missing) };
}

export function readiness(graph: Graph, profile: Profile, target: Target): Readiness {
  const held = holdings(profile);
  const requirements = requirementsOf(graph, target);
  return readinessOf(
    requirements.filter((r) => held.has(r.item.id)),
    requirements.filter((r) => !held.has(r.item.id)),
  );
}

function readinessOf(met: readonly { weight: Weight }[], missing: readonly { weight: Weight }[]): Readiness {
  const sum = (rows: readonly { weight: Weight }[]) => rows.reduce((s, r) => s + weightValue[r.weight], 0);
  const total = sum(met) + sum(missing);
  const score = total === 0 ? 1 : sum(met) / total;
  const criticalMet = !missing.some((r) => r.weight === "critical");
  const band: Band =
    criticalMet && score >= thresholds.reachable
      ? "reachable"
      : score >= thresholds.stretch
        ? "stretch"
        : "far";
  return { score, criticalMet, band };
}

/**
 * Orders items to learn: Critical before Important before Nice; within a weight, prerequisites first (topological
 * order over `builds_on` among those items); then items more roles require; then by name.
 */
export function learningOrder<T extends { item: GraphNode; weight: Weight }>(
  graph: Graph,
  items: readonly T[],
): T[] {
  const result: T[] = [];
  for (const w of weights) {
    const group = items.filter((i) => i.weight === w);
    const ids = new Set(group.map((i) => i.item.id));
    // prerequisites still to learn within this weight
    const waitingFor = new Map(
      group.map((i) => [
        i.item.id,
        new Set(
          outgoing(graph, i.item.id, "builds_on")
            .map((e) => e.targetId)
            .filter((id) => ids.has(id)),
        ),
      ]),
    );
    const rank = (i: T) => [-(graph.demand.get(i.item.id) ?? 0), i.item.name] as const;
    const before = (a: T, b: T) => {
      const [da, na] = rank(a);
      const [db, nb] = rank(b);
      return da - db || na.localeCompare(nb);
    };
    const pending = [...group];
    while (pending.length) {
      const ready = pending.filter((i) => waitingFor.get(i.item.id)!.size === 0).sort(before);
      // a cycle among the remaining items (shouldn't happen: writes are checked) falls back to the plain order
      const next = ready[0] ?? [...pending].sort(before)[0];
      result.push(next);
      pending.splice(pending.indexOf(next), 1);
      for (const waits of waitingFor.values()) waits.delete(next.item.id);
    }
  }
  return result;
}

export interface ComparisonRow {
  item: GraphNode;
  weightA?: Weight;
  weightB?: Weight;
  /** With a profile: whether the person already has it. */
  has?: boolean;
  certification?: CertificationStatus;
}

export interface Comparison {
  a: Target;
  b: Target;
  /** Required by both; sorted by B's weight. */
  shared: ComparisonRow[];
  /** Only B requires these: what moving from A to B adds. Sorted by weight. */
  onlyB: ComparisonRow[];
  /** Only A requires these: B doesn't need them. */
  onlyA: ComparisonRow[];
}

/** Compares two targets; with a profile, each shared and B-only row says whether the person already has it. */
export function compare(
  graph: Graph,
  a: Target,
  b: Target,
  profile?: Profile,
  today?: Date | string,
): Comparison {
  const ra = new Map(requirementsOf(graph, a).map((r) => [r.item.id, r]));
  const rb = new Map(requirementsOf(graph, b).map((r) => [r.item.id, r]));
  const held = profile ? holdings(profile) : null;
  const withProfile = (row: ComparisonRow): ComparisonRow => {
    if (!held) return row;
    const h = held.get(row.item.id);
    return {
      ...row,
      has: Boolean(h),
      ...(h && row.item.type === "certification" && today
        ? { certification: certificationStatus(h, today) }
        : {}),
    };
  };
  const sortBy = (key: "weightA" | "weightB") => (x: ComparisonRow, y: ComparisonRow) =>
    weightRank(x[key]!) - weightRank(y[key]!) || x.item.name.localeCompare(y.item.name);
  return {
    a,
    b,
    shared: [...rb.values()]
      .filter((r) => ra.has(r.item.id))
      .map((r) => withProfile({ item: r.item, weightA: ra.get(r.item.id)!.weight, weightB: r.weight }))
      .sort(sortBy("weightB")),
    onlyB: [...rb.values()]
      .filter((r) => !ra.has(r.item.id))
      .map((r) => withProfile({ item: r.item, weightB: r.weight }))
      .sort(sortBy("weightB")),
    onlyA: [...ra.values()]
      .filter((r) => !rb.has(r.item.id))
      .map((r) => ({ item: r.item, weightA: r.weight }))
      .sort(sortBy("weightA")),
  };
}
