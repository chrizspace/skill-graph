import type { Change } from "./change-requests";
import {
  incoming,
  isCatalogue,
  isRoleLike,
  node,
  outgoing,
  specializationsOf,
  type EdgeKind,
  type Graph,
  type GraphNode,
  type Weight,
} from "./graph";
import { normalizeName } from "./names";

/** Would adding "from builds on to" close a loop (to already builds on from, directly or not)? */
export function wouldCreateCycle(graph: Graph, fromId: string, toId: string) {
  if (fromId === toId) return true;
  const seen = new Set<string>();
  const stack = [toId];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === fromId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...outgoing(graph, id, "builds_on").map((e) => e.targetId));
  }
  return false;
}

export interface LinkInput {
  kind: EdgeKind;
  sourceId: string;
  targetId: string;
  priority?: Weight | null;
}

/**
 * Problems that make a link invalid, and warnings to confirm (a `builds_on` cycle). Type rules per kind
 * (docs/PLAN.md §3): requires role/specialisation → catalogue item with a weight; builds_on and related_to between
 * catalogue items; next_step between roles/specialisations.
 */
export function checkLink(graph: Graph, link: LinkInput) {
  const problems: string[] = [];
  const warnings: string[] = [];
  const from = graph.nodes.get(link.sourceId);
  const to = graph.nodes.get(link.targetId);
  if (!from || !to) return { problems: ["Both ends of the link must exist."], warnings };
  if (from.id === to.id) problems.push(`${from.name} can't be linked to itself.`);
  const rule: Record<EdgeKind, [boolean, string]> = {
    requires: [
      isRoleLike(from) && isCatalogue(to),
      "A requirement links a role or specialisation to a skill or certification.",
    ],
    builds_on: [
      isCatalogue(from) && isCatalogue(to),
      "Only skills and certifications can build on each other.",
    ],
    related_to: [isCatalogue(from) && isCatalogue(to), "Only skills and certifications can be related."],
    next_step: [isRoleLike(from) && isRoleLike(to), "A path links two roles or specialisations."],
  };
  if (!rule[link.kind][0]) problems.push(rule[link.kind][1]);
  if (link.kind === "requires" && !link.priority) problems.push("A requirement needs a weight.");
  if (link.kind !== "requires" && link.priority) problems.push("Only requirements have a weight.");
  const exists = (a: string, b: string) => outgoing(graph, a, link.kind).some((e) => e.targetId === b);
  if (exists(from.id, to.id) || (link.kind === "related_to" && exists(to.id, from.id))) {
    problems.push(`${from.name} → ${to.name} already exists.`);
  }
  if (link.kind === "builds_on" && from.id !== to.id && wouldCreateCycle(graph, from.id, to.id)) {
    warnings.push(`${to.name} already builds on ${from.name}: this would make a loop.`);
  }
  return { problems, warnings };
}

/** Is this name free? Specialisations only need a unique name within their role. */
export function nameTaken(
  graph: Graph,
  name: string,
  scope: { parentRoleId?: string; exceptId?: string } = {},
) {
  const key = normalizeName(name);
  return [...graph.nodes.values()].some(
    (n) =>
      n.id !== scope.exceptId &&
      normalizeName(n.name) === key &&
      (scope.parentRoleId
        ? n.type === "specialization" && n.parentRoleId === scope.parentRoleId
        : n.type !== "specialization"),
  );
}

/** What deleting a node would take with it, to show before confirming. */
export function impactOfDeleting(graph: Graph, nodeId: string) {
  const n = node(graph, nodeId);
  const specializations = n.type === "role" ? specializationsOf(graph, n.id, { includeDrafts: true }) : [];
  const ids = [n.id, ...specializations.map((s) => s.id)];
  const links = new Set(ids.flatMap((id) => [...outgoing(graph, id), ...incoming(graph, id)]));
  return {
    links: links.size,
    requiredBy: incoming(graph, n.id, "requires")
      .map((e) => node(graph, e.sourceId).name)
      .sort(),
    specializations: specializations.map((s) => s.name),
  };
}

export interface RequestScope {
  practiceId: string;
  /** The role or specialisation the request is about; empty for a new-role proposal. */
  roleId: string | null;
}

/**
 * Re-checks every operation of a change request against the current graph (docs/PLAN.md §4 "Change requests").
 * Returns human-readable problems; an empty list means the request can be applied.
 */
export function validateChanges(graph: Graph, scope: RequestScope, changes: readonly Change[]): string[] {
  const problems: string[] = [];
  let subject: GraphNode | null = null;
  if (scope.roleId) {
    subject = graph.nodes.get(scope.roleId) ?? null;
    if (!subject || !isRoleLike(subject)) return ["The role this request is about no longer exists."];
    const role = subject.type === "specialization" ? node(graph, subject.parentRoleId!) : subject;
    if (role.practiceId !== scope.practiceId) problems.push(`${role.name} isn't a role of this practice.`);
  } else if (changes.some((c) => c.op !== "propose_role")) {
    return ["Only a new-role proposal can be made without a role."];
  }

  const requires = (itemId: string) =>
    subject ? outgoing(graph, subject.id, "requires").some((e) => e.targetId === itemId) : false;
  const nameOf = (id: string) => graph.nodes.get(id)?.name ?? "an item that no longer exists";
  const touched = new Set<string>();
  for (const c of changes) {
    const key = "itemId" in c && c.itemId ? c.itemId : "toId" in c ? c.toId : null;
    if (key) {
      if (touched.has(key)) problems.push(`${nameOf(key)} appears more than once in this request.`);
      touched.add(key);
    }
    switch (c.op) {
      case "add_requirement":
        if (c.itemId) {
          const item = graph.nodes.get(c.itemId);
          if (!item || !isCatalogue(item))
            problems.push("A requirement must be a skill or certification that exists.");
          else if (requires(item.id)) problems.push(`${subject!.name} already requires ${item.name}.`);
        } else if (c.newItem && nameTaken(graph, c.newItem.name)) {
          problems.push(`"${c.newItem.name}" already exists: pick it instead of creating it.`);
        }
        break;
      case "update_requirement":
      case "remove_requirement":
        if (!requires(c.itemId)) problems.push(`${subject!.name} doesn't require ${nameOf(c.itemId)}.`);
        if (c.op === "update_requirement" && c.priority === undefined && c.note === undefined) {
          problems.push(`Nothing to change for ${nameOf(c.itemId)}.`);
        }
        break;
      case "add_path": {
        const to = graph.nodes.get(c.toId);
        if (!to || !isRoleLike(to))
          problems.push("A path must lead to a role or specialisation that exists.");
        else
          problems.push(
            ...checkLink(graph, { kind: "next_step", sourceId: subject!.id, targetId: to.id }).problems,
          );
        break;
      }
      case "remove_path":
        if (!outgoing(graph, subject!.id, "next_step").some((e) => e.targetId === c.toId)) {
          problems.push(`There's no path from ${subject!.name} to ${nameOf(c.toId)}.`);
        }
        break;
      case "propose_specialization":
        if (subject!.type !== "role") problems.push("Specialisations can only be proposed for a role.");
        else if (nameTaken(graph, c.name, { parentRoleId: subject!.id })) {
          problems.push(`${subject!.name} already has a specialisation called "${c.name}".`);
        }
        break;
      case "propose_role":
        if (nameTaken(graph, c.name)) problems.push(`"${c.name}" already exists.`);
        break;
      case "update_description":
        break;
    }
  }
  return problems;
}
