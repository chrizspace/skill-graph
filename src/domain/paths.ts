import { readiness, type Readiness } from "./assess";
import {
  checkTarget,
  node,
  outgoing,
  roles,
  specializationsOf,
  targetLabel,
  type Graph,
  type Target,
} from "./graph";
import type { Profile } from "./profile";

export interface PathOption {
  target: Target;
  label: string;
  kind: "official" | "specialization" | "suggested";
  /** Official paths: the roles passed on the way (excluding the start, including the target). */
  route: string[];
  note: string | null;
  typicalMonths: number | null;
  readiness: Readiness;
}

export interface Paths {
  /** Official paths from the current role (and specialisation), up to `maxHops` moves, closest first. */
  official: PathOption[];
  /** The other specialisations of the current role. */
  specializations: PathOption[];
  /** Roles the person is already close to that no official path leads to, labelled as suggestions. */
  suggested: PathOption[];
}

const toTarget = (graph: Graph, id: string): Target => {
  const n = node(graph, id);
  return n.type === "specialization" ? { roleId: n.parentRoleId!, specializationId: n.id } : { roleId: n.id };
};

/** A person's paths from their current role (docs/PLAN.md §1 "Path", §4). Empty when they have no current role. */
export function pathsFor(
  graph: Graph,
  profile: Profile,
  { maxHops = 3, suggestions = 3 }: { maxHops?: number; suggestions?: number } = {},
): Paths {
  if (!profile.current) return { official: [], specializations: [], suggested: [] };
  const { role, specialization } = checkTarget(graph, profile.current);
  const option = (t: Target, kind: PathOption["kind"], extra: Partial<PathOption> = {}): PathOption => ({
    target: t,
    label: targetLabel(graph, t),
    kind,
    route: [],
    note: null,
    typicalMonths: null,
    readiness: readiness(graph, profile, t),
    ...extra,
  });

  // breadth-first over official paths, from the role and from the specialisation
  const official: PathOption[] = [];
  const seen = new Set([role.id, ...(specialization ? [specialization.id] : [])]);
  let frontier = [...seen].map((id) => ({
    id,
    route: [] as string[],
    note: null as string | null,
    months: 0 as number | null,
  }));
  for (let hop = 1; hop <= maxHops && frontier.length; hop++) {
    const next: typeof frontier = [];
    for (const from of frontier) {
      for (const e of outgoing(graph, from.id, "next_step")) {
        const to = node(graph, e.targetId);
        if (seen.has(to.id) || to.status !== "published") continue;
        seen.add(to.id);
        const route = [...from.route, to.id];
        // the first move's description describes the path; durations add up while every hop has one
        const note = from.route.length ? from.note : e.note;
        const months =
          from.months !== null && e.typicalMonths !== null ? from.months + e.typicalMonths : null;
        next.push({ id: to.id, route, note, months });
        official.push(
          option(toTarget(graph, to.id), "official", {
            route: route.map((id) => node(graph, id).name),
            note,
            typicalMonths: months,
          }),
        );
      }
    }
    frontier = next;
  }

  const specializations = specializationsOf(graph, role.id)
    .filter((s) => s.id !== specialization?.id)
    .map((s) => option({ roleId: role.id, specializationId: s.id }, "specialization"));

  const officialRoles = new Set(official.map((o) => o.target.roleId));
  const suggested = roles(graph)
    .filter((r) => r.id !== role.id && !officialRoles.has(r.id))
    .map((r) => option({ roleId: r.id }, "suggested"))
    .filter((o) => o.readiness.score > 0)
    .sort((x, y) => y.readiness.score - x.readiness.score || x.label.localeCompare(y.label))
    .slice(0, suggestions);

  return { official, specializations, suggested };
}
