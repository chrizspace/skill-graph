/**
 * Who may edit which node, and the rules for new roles and catalogue items (docs/PLAN.md §1 "Practice Lead", §4
 * "Validators"). Pure: the write layer in src/db/graph-write.ts calls these inside its transaction.
 */
import { can, type Actor } from "./access";
import { isCatalogue, isRoleLike, type Graph, type GraphNode } from "./graph";
import { normalizeName, slugify, specializationSlug } from "./names";
import { nameTaken } from "./validate";

/** The practice a role or specialisation belongs to (a specialisation's is its role's); null for catalogue items. */
export function practiceIdOf(graph: Graph, nodeId: string): string | null {
  const n = graph.nodes.get(nodeId);
  if (!n) return null;
  if (n.type === "role") return n.practiceId;
  if (n.type === "specialization") return graph.nodes.get(n.parentRoleId!)?.practiceId ?? null;
  return null;
}

/** May this person edit the role or specialisation: its practice's leads, and the Site Lead in an emergency. */
export function canEditNode(actor: Actor, graph: Graph, nodeId: string) {
  const practiceId = practiceIdOf(graph, nodeId);
  return practiceId !== null && can(actor, "role:edit", { practiceId });
}

/** A Site Lead editing a practice they don't lead: allowed, but recorded as an emergency edit in the audit log. */
export const isEmergencyEdit = (actor: Actor, practiceId: string) =>
  actor.siteLead && !actor.leadOf.some((p) => p.id === practiceId);

/** A slug not used by any node yet: "scrum-master", then "scrum-master-2", … */
export function freeSlug(graph: Graph, base: string) {
  const taken = new Set([...graph.nodes.values()].map((n) => n.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

export const roleSlug = (graph: Graph, name: string) => freeSlug(graph, slugify(name));
export const specSlug = (graph: Graph, roleName: string, name: string) =>
  freeSlug(graph, specializationSlug(roleName, name));

const MAX_NAME = 120;
const MAX_TEXT = 2000;

/** Problems with a name and description typed in a form (empty list: fine). */
export function checkText(name: string, description: string) {
  const problems: string[] = [];
  if (!name.trim()) problems.push("A name is required.");
  if (name.trim().length > MAX_NAME) problems.push(`The name can be at most ${MAX_NAME} characters.`);
  if (description.trim().length > MAX_TEXT)
    problems.push(`The description can be at most ${MAX_TEXT} characters.`);
  return problems;
}

export function checkNewRole(graph: Graph, name: string, description: string) {
  const problems = checkText(name, description);
  if (!description.trim()) problems.push("Describe what the role does.");
  if (name.trim() && nameTaken(graph, name))
    problems.push(`"${name.trim()}" already exists: roles and skills share one set of names.`);
  return problems;
}

export function checkNewSpecialization(graph: Graph, role: GraphNode, name: string, description: string) {
  const problems = checkText(name, description);
  if (!description.trim()) problems.push("Describe what the specialisation adds.");
  if (role.type !== "role") problems.push("Specialisations belong to a role.");
  else if (name.trim() && nameTaken(graph, name, { parentRoleId: role.id })) {
    problems.push(`${role.name} already has a specialisation called "${name.trim()}".`);
  }
  return problems;
}

export function checkNewItem(
  graph: Graph,
  input: { type: string; name: string; issuer?: string | null; description?: string },
) {
  const problems = checkText(input.name, input.description ?? "");
  if (!["technical_skill", "soft_skill", "certification"].includes(input.type)) {
    problems.push("Choose technical skill, soft skill or certification.");
  }
  if (input.issuer?.trim() && input.type !== "certification")
    problems.push("Only a certification has an issuer.");
  const key = normalizeName(input.name);
  const existing = key
    ? [...graph.nodes.values()].find((n) => n.type !== "specialization" && normalizeName(n.name) === key)
    : undefined;
  if (existing)
    problems.push(
      `"${input.name.trim()}" already exists (${existing.name}): pick it instead of adding it again.`,
    );
  return problems;
}

/** A published role or specialisation, or a problem if the id isn't one (for forms that pick a role). */
export function roleLike(graph: Graph, id: string): GraphNode | null {
  const n = graph.nodes.get(id);
  return n && isRoleLike(n) ? n : null;
}

export const catalogueItem = (graph: Graph, id: string): GraphNode | null => {
  const n = graph.nodes.get(id);
  return n && isCatalogue(n) && n.status === "published" ? n : null;
};
