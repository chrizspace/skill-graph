/**
 * What the Site Lead sees and does (docs/PLAN.md §1 "Site Lead"): aggregates that never name anyone, merging duplicate
 * catalogue items, and reporting lines. Pure: the database layer (src/db/site.ts) carries out what these decide.
 */
import { aggregateByGroup, benchStrength, type Bench, type Group, type Person } from "./aggregates";
import { readiness } from "./assess";
import { thresholds } from "./config";
import {
  isCatalogue,
  node,
  roles,
  specializationsOf,
  weightRank,
  type Graph,
  type GraphEdge,
  type GraphNode,
  type Target,
  type Weight,
} from "./graph";
import { teamGaps } from "./people";

// ------------------------------------------------------------------------------------------------ aggregates

/** A count shown to the Site Lead: a small one (1 to `min` - 1) is withheld, as it would point at individuals. */
export type Count = number | null;
const withhold = (n: number, min: number): Count => (n > 0 && n < min ? null : n);

export interface AggregateGap {
  item: GraphNode;
  weight: Weight;
  /** how many people miss it: never who. Null: fewer than the minimum group size */
  count: Count;
}

export interface GroupAggregate {
  /** mean of how well they meet their current role, 0 to 1 */
  averageFit: number;
  /** how many of them still miss a Critical requirement of their role (null: fewer than the minimum) */
  criticalMissing: Count;
  gaps: AggregateGap[];
}

/** Readiness and gaps for a group of people, as numbers only. */
function aggregate(
  graph: Graph,
  people: readonly Person[],
  today: Date | string,
  min: number,
): GroupAggregate {
  const withRole = people.filter((p) => p.profile.current);
  const fits = withRole.map((p) => readiness(graph, p.profile, p.profile.current!));
  return {
    averageFit: fits.length ? fits.reduce((sum, f) => sum + f.score, 0) / fits.length : 0,
    criticalMissing: withhold(fits.filter((f) => !f.criticalMet).length, min),
    gaps: teamGaps(graph, people, today)
      .slice(0, 5)
      .map((g) => ({ item: g.item, weight: g.weight, count: withhold(g.people.length, min) })),
  };
}

export interface SiteBench extends Omit<Bench, "reachable" | "stretch"> {
  reachable: Count;
  stretch: Count;
}

export interface SiteOverview {
  people: number;
  /** by home practice */
  practices: (Group<GroupAggregate> & { name: string })[];
  /** by current role */
  roles: (Group<GroupAggregate> & { name: string; practiceName: string | null })[];
  /** how many people are reachable for, or a stretch from, each role (counts only; small ones withheld) */
  bench: SiteBench[];
}

/**
 * The site at a glance: readiness and gaps per practice and per role, and bench strength per role. Groups of fewer
 * than `minGroupSize` people are hidden so nobody can be singled out; nothing in the result identifies a person.
 */
export function siteOverview(
  graph: Graph,
  people: readonly Person[],
  practices: readonly { id: string; name: string }[],
  today: Date | string,
  min: number = thresholds.minGroupSize,
): SiteOverview {
  const byPractice = new Map<string, Person[]>(practices.map((p) => [p.id, []]));
  const byRole = new Map<string, Person[]>();
  for (const p of people) {
    if (p.practiceId && byPractice.has(p.practiceId)) byPractice.get(p.practiceId)!.push(p);
    const roleId = p.profile.current?.roleId;
    if (roleId) byRole.set(roleId, [...(byRole.get(roleId) ?? []), p]);
  }
  const compute = (group: readonly Person[]) => aggregate(graph, group, today, min);
  const practiceName = new Map(practices.map((p) => [p.id, p.name]));
  const targets: Target[] = roles(graph).flatMap((r) => [
    { roleId: r.id },
    ...specializationsOf(graph, r.id).map((s) => ({ roleId: r.id, specializationId: s.id })),
  ]);
  return {
    people: people.length,
    practices: aggregateByGroup(byPractice, compute, min).map((g) => ({
      ...g,
      name: practiceName.get(g.key) ?? "",
    })),
    roles: aggregateByGroup(byRole, compute, min)
      .map((g) => {
        const role = node(graph, g.key);
        return {
          ...g,
          name: role.name,
          practiceName: role.practiceId ? (practiceName.get(role.practiceId) ?? null) : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    // site-wide, so the population is everyone; with fewer people than the minimum there is nothing to show
    bench:
      people.length >= min
        ? benchStrength(graph, people, targets).map((b) => ({
            target: b.target,
            label: b.label,
            reachable: withhold(b.reachable, min),
            stretch: withhold(b.stretch, min),
          }))
        : [],
  };
}

// ------------------------------------------------------------------------------------------------ merging items

export interface MergePlan {
  problems: string[];
  /** links to the item being dropped that move to the one being kept */
  moves: { edge: GraphEdge; sourceId: string; targetId: string }[];
  /** links that disappear because the kept item already has them, or they would loop */
  drops: { edge: GraphEdge; why: string }[];
  /** requirements both items had: the kept item takes the stronger weight */
  upgrades: { edge: GraphEdge; priority: Weight }[];
  /** for the confirmation window */
  requirementsMoved: number;
  requirementConflicts: { owner: string; kept: Weight; dropped: Weight; result: Weight }[];
  linksMoved: number;
  linksDropped: number;
}

const key = (e: { kind: string; sourceId: string; targetId: string }) =>
  `${e.kind}|${e.sourceId}|${e.targetId}`;

/**
 * What merging one catalogue item into another does (docs/PLAN.md §1 "Site Lead": merge duplicates): every link to the
 * dropped item moves to the kept one. Where the kept item already has the link it isn't doubled (a requirement both had
 * keeps the stronger weight), and a link that would loop or close a prerequisite cycle is dropped. Both must be
 * published items of the same type.
 */
export function planMerge(graph: Graph, keepId: string, dropId: string): MergePlan {
  const plan: MergePlan = {
    problems: [],
    moves: [],
    drops: [],
    upgrades: [],
    requirementsMoved: 0,
    requirementConflicts: [],
    linksMoved: 0,
    linksDropped: 0,
  };
  const keep = graph.nodes.get(keepId);
  const drop = graph.nodes.get(dropId);
  if (!keep || !drop || !isCatalogue(keep) || !isCatalogue(drop)) {
    plan.problems.push("Both must be skills or certifications from the catalogue.");
    return plan;
  }
  if (keep.id === drop.id) plan.problems.push("Choose two different items.");
  if (keep.type !== drop.type)
    plan.problems.push(
      `${keep.name} is a ${keep.type.replace("_", " ")} and ${drop.name} a ${drop.type.replace("_", " ")}: only items of the same type can be merged.`,
    );
  if (keep.status !== "published" || drop.status !== "published")
    plan.problems.push("Only published items can be merged.");
  if (plan.problems.length) return plan;

  const existing = new Set(graph.edges.map(key));
  const taken = new Set<string>();
  // a copy of the prerequisites that follows the moves, to catch a cycle the moves would close
  const builds = new Map<string, Set<string>>();
  for (const e of graph.edges.filter((x) => x.kind === "builds_on")) {
    builds.set(e.sourceId, (builds.get(e.sourceId) ?? new Set()).add(e.targetId));
  }
  const cycleAfter = (from: string, to: string) => {
    const seen = new Set<string>();
    const stack = [to];
    while (stack.length) {
      const id = stack.pop()!;
      if (id === from) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push(...(builds.get(id) ?? []));
    }
    return false;
  };

  for (const e of graph.edges.filter((x) => x.sourceId === drop.id || x.targetId === drop.id)) {
    const sourceId = e.sourceId === drop.id ? keep.id : e.sourceId;
    const targetId = e.targetId === drop.id ? keep.id : e.targetId;
    if (sourceId === targetId) {
      plan.drops.push({ edge: e, why: "it would link the item to itself" });
      continue;
    }
    // related pairs are stored with the smaller id first
    const [s, t] =
      e.kind === "related_to" && sourceId > targetId ? [targetId, sourceId] : [sourceId, targetId];
    const k = key({ kind: e.kind, sourceId: s, targetId: t });
    if (existing.has(k) || taken.has(k)) {
      if (e.kind === "requires") {
        const kept = graph.edges.find((x) => key(x) === k);
        const keptPriority =
          kept?.priority ??
          plan.moves.find((m) => key({ kind: m.edge.kind, sourceId: m.sourceId, targetId: m.targetId }) === k)
            ?.edge.priority ??
          e.priority!;
        const stronger = weightRank(e.priority!) < weightRank(keptPriority) ? e.priority! : keptPriority;
        plan.requirementConflicts.push({
          owner: node(graph, e.sourceId).name,
          kept: keptPriority,
          dropped: e.priority!,
          result: stronger,
        });
        if (kept && stronger !== kept.priority) plan.upgrades.push({ edge: kept, priority: stronger });
      }
      plan.drops.push({ edge: e, why: "the kept item already has it" });
      continue;
    }
    if (e.kind === "builds_on" && cycleAfter(s, t)) {
      plan.drops.push({ edge: e, why: "it would make a prerequisite loop" });
      continue;
    }
    if (e.kind === "builds_on") builds.set(s, (builds.get(s) ?? new Set()).add(t));
    taken.add(k);
    plan.moves.push({ edge: e, sourceId: s, targetId: t });
  }
  plan.requirementsMoved = plan.moves.filter((m) => m.edge.kind === "requires").length;
  plan.linksMoved = plan.moves.filter((m) => m.edge.kind !== "requires").length;
  plan.linksDropped = plan.drops.length;
  return plan;
}

// ------------------------------------------------------------------------------------------------ reporting lines

/** Would making `managerId` the manager of `personId` close a loop (the person already manages them, however indirectly)? */
export function reportingCycle(
  managerOf: ReadonlyMap<string, string | null>,
  personId: string,
  managerId: string | null,
) {
  const seen = new Set<string>();
  for (let id = managerId; id; id = managerOf.get(id) ?? null) {
    if (id === personId) return true;
    if (seen.has(id)) return false; // an existing loop elsewhere: not this change's doing
    seen.add(id);
  }
  return false;
}
