/**
 * What a manager or Practice Lead sees about people (docs/PLAN.md §1 "Manager", "Practice Lead", §4): a one-line
 * summary per person, certifications to watch, the roles someone could reach with what they have now, and the gaps a
 * whole team shares. Pure; who may see which person is decided by `can()` (src/domain/access.ts), not here.
 */
import { assess, readiness, type AssessedItem, type Readiness } from "./assess";
import type { Person } from "./aggregates";
import {
  isCatalogue,
  node,
  roles,
  specializationsOf,
  targetLabel,
  weightRank,
  type Graph,
  type GraphNode,
  type Target,
  type Weight,
} from "./graph";
import { certificationStatus, type CertificationStatus, type Profile } from "./profile";

export interface CertificationAlert {
  item: GraphNode;
  status: Exclude<CertificationStatus, "valid">;
  expiresOn: string;
}

/** The held certifications that are expiring (within 90 days) or expired, soonest first. Expired ones are still held. */
export function certificationAlerts(
  graph: Graph,
  profile: Profile,
  today: Date | string,
): CertificationAlert[] {
  return profile.items
    .flatMap((h) => {
      const item = graph.nodes.get(h.nodeId);
      if (!item || item.type !== "certification" || !h.expiresOn) return [];
      const status = certificationStatus(h, today);
      return status === "valid" ? [] : [{ item, status, expiresOn: h.expiresOn }];
    })
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
}

export interface PersonSummary {
  id: string;
  current: Target | null;
  currentLabel: string | null;
  target: Target | null;
  targetLabel: string | null;
  /** how they meet their current role */
  fit: Readiness | null;
  /** progress towards their target */
  targetFit: Readiness | null;
  /** the first things still to learn for the current role, Critical first, in learning order */
  topGaps: AssessedItem[];
  alerts: CertificationAlert[];
}

/** A person at a glance, for the team and practice lists. */
export function summarize(
  graph: Graph,
  person: Person,
  today: Date | string,
  { gaps = 3 } = {},
): PersonSummary {
  const { current, target } = person.profile;
  const a = current ? assess(graph, person.profile, current, today) : null;
  return {
    id: person.id,
    current: current ?? null,
    currentLabel: current ? targetLabel(graph, current) : null,
    target: target ?? null,
    targetLabel: target ? targetLabel(graph, target) : null,
    fit: a?.readiness ?? null,
    targetFit: target ? readiness(graph, person.profile, target) : null,
    topGaps: a ? a.missing.slice(0, gaps) : [],
    alerts: certificationAlerts(graph, person.profile, today),
  };
}

export interface ReachableRole {
  target: Target;
  label: string;
  readiness: Readiness;
}

/**
 * The roles and specialisations someone could take on with what they have now: every Critical requirement met and
 * readiness over the threshold. Their own role is left out. Best fit first.
 */
export function reachableRoles(graph: Graph, profile: Profile, { limit = 8 } = {}): ReachableRole[] {
  const own = profile.current;
  const targets: Target[] = roles(graph).flatMap((r) => [
    { roleId: r.id },
    ...specializationsOf(graph, r.id).map((s) => ({ roleId: r.id, specializationId: s.id })),
  ]);
  return targets
    .filter(
      (t) =>
        !(own && t.roleId === own.roleId && (t.specializationId ?? null) === (own.specializationId ?? null)),
    )
    .map((t) => ({ target: t, label: targetLabel(graph, t), readiness: readiness(graph, profile, t) }))
    .filter((r) => r.readiness.band === "reachable")
    .sort((a, b) => b.readiness.score - a.readiness.score || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export interface TeamGap {
  item: GraphNode;
  /** the highest weight the item has among the people who miss it */
  weight: Weight;
  people: string[];
}

/**
 * Gaps a team shares: per skill or certification, who misses it as a Critical or Important requirement of their current
 * role or their target, and the highest weight it has for them. Most shared first, Critical before Important.
 */
export function teamGaps(graph: Graph, people: readonly Person[], today: Date | string): TeamGap[] {
  const byItem = new Map<string, { weight: Weight; people: Set<string> }>();
  for (const p of people) {
    for (const t of [p.profile.current, p.profile.target]) {
      if (!t) continue;
      for (const r of assess(graph, p.profile, t, today).missing) {
        if (r.weight === "nice" || !isCatalogue(r.item)) continue;
        const entry = byItem.get(r.item.id) ?? { weight: r.weight, people: new Set<string>() };
        if (weightRank(r.weight) < weightRank(entry.weight)) entry.weight = r.weight;
        entry.people.add(p.id);
        byItem.set(r.item.id, entry);
      }
    }
  }
  return [...byItem]
    .map(([id, e]) => ({ item: node(graph, id), weight: e.weight, people: [...e.people].sort() }))
    .sort(
      (a, b) =>
        b.people.length - a.people.length ||
        weightRank(a.weight) - weightRank(b.weight) ||
        a.item.name.localeCompare(b.item.name),
    );
}

export interface RoleReadiness {
  role: GraphNode;
  people: string[];
  /** the mean of how well they meet this role, 0 to 1 */
  average: number;
  /** how many of them still miss a Critical requirement of it */
  criticalMissing: number;
  gaps: TeamGap[];
}

/**
 * A practice's people by the role they hold: how many, how well they meet it on average, how many still miss a Critical
 * requirement, and what they miss most. Roles nobody holds are left out.
 */
export function readinessPerRole(
  graph: Graph,
  people: readonly Person[],
  today: Date | string,
  { gaps = 3 } = {},
): RoleReadiness[] {
  const groups = new Map<string, Person[]>();
  for (const p of people) {
    const roleId = p.profile.current?.roleId;
    if (roleId) groups.set(roleId, [...(groups.get(roleId) ?? []), p]);
  }
  return [...groups]
    .map(([roleId, group]) => {
      const fits = group.map((p) => readiness(graph, p.profile, p.profile.current!));
      return {
        role: node(graph, roleId),
        people: group.map((p) => p.id).sort(),
        average: fits.reduce((sum, f) => sum + f.score, 0) / fits.length,
        criticalMissing: fits.filter((f) => !f.criticalMet).length,
        // gaps for the role itself, not for anyone's other target
        gaps: teamGaps(
          graph,
          group.map((p) => ({ ...p, profile: { ...p.profile, target: null } })),
          today,
        ).slice(0, gaps),
      };
    })
    .sort((a, b) => a.role.name.localeCompare(b.role.name));
}
