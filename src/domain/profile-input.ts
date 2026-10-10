/**
 * Checks what a person submits about their own profile (docs/PLAN.md §1 "Profile"): which skills and certifications
 * they may declare, certification dates, and which role or specialisation they pick. Pure: the server actions call
 * these with the graph and only write what passes.
 */
import { checkTarget, isCatalogue, isRoleLike, type Graph, type GraphNode, type Target } from "./graph";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (value: string) =>
  ISO_DAY.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

/** The role or specialisation a slug names (a specialisation's slug is scoped to its role), published only. */
export function targetBySlug(graph: Graph, slug: string): Target | null {
  const found = [...graph.nodes.values()].find(
    (n) => isRoleLike(n) && n.slug === slug && n.status === "published",
  );
  if (!found) return null;
  return found.type === "specialization"
    ? { roleId: found.parentRoleId!, specializationId: found.id }
    : { roleId: found.id, specializationId: null };
}

/** The slug of a target: its specialisation's if it has one, else its role's. */
export function slugOfTarget(graph: Graph, target: Target) {
  const { role, specialization } = checkTarget(graph, target);
  return (specialization ?? role).slug;
}

/** A target made of ids from a form; null if it isn't a published role, or its specialisation isn't that role's. */
export function validTarget(graph: Graph, roleId: string, specializationId?: string | null): Target | null {
  try {
    const { role, specialization } = checkTarget(graph, { roleId, specializationId });
    if (role.status !== "published" || (specialization && specialization.status !== "published")) return null;
    return { roleId: role.id, specializationId: specialization?.id ?? null };
  } catch {
    return null;
  }
}

const isSkill = (n: GraphNode | undefined): n is GraphNode =>
  Boolean(n && (n.type === "technical_skill" || n.type === "soft_skill") && n.status === "published");

/** The ids that are published technical or soft skills; anything else (certifications, roles, unknown ids) is dropped. */
export function skillIds(graph: Graph, ids: readonly string[]) {
  return [...new Set(ids)].filter((id) => isSkill(graph.nodes.get(id)));
}

export interface CertificationInput {
  nodeId: string;
  obtainedOn: string | null;
  expiresOn: string | null;
}

/** A certification a person holds, with its dates; the error says what to fix. Dates are optional but must make sense. */
export function parseCertification(
  graph: Graph,
  input: { nodeId: string; obtainedOn?: string; expiresOn?: string },
): { ok: true; value: CertificationInput } | { ok: false; error: string } {
  const item = graph.nodes.get(input.nodeId);
  if (!item || item.type !== "certification" || item.status !== "published") {
    return { ok: false, error: "Choose a certification from the catalogue." };
  }
  const obtainedOn = input.obtainedOn?.trim() || null;
  const expiresOn = input.expiresOn?.trim() || null;
  if (obtainedOn && !isDay(obtainedOn)) return { ok: false, error: "The date obtained isn't a valid date." };
  if (expiresOn && !isDay(expiresOn)) return { ok: false, error: "The expiry date isn't a valid date." };
  if (obtainedOn && expiresOn && expiresOn < obtainedOn) {
    return { ok: false, error: "A certification can't expire before it was obtained." };
  }
  return { ok: true, value: { nodeId: item.id, obtainedOn, expiresOn } };
}

/** What a catalogue item is, for the checks above; used by the profile editor to list what can be declared. */
export const isDeclarable = (n: GraphNode) => isCatalogue(n) && n.status === "published";
