/**
 * Who may do what (docs/PLAN.md §1, "Permissions"). Pure: the server loads an Actor from the database and every
 * capability is checked by `can()`. Capabilities add up: one person can be a manager, a Practice Lead and a Site Lead.
 */
export interface PracticeRef {
  id: string;
  slug: string;
  name: string;
}

/** A signed-in person and what the data says they are. Everyone is an Employee. */
export interface Actor {
  userId: string;
  name: string;
  email: string;
  /** home practice */
  practiceId: string | null;
  /** how many people report to them: a manager has at least one */
  reportCount: number;
  /** practices they are a Practice Lead of */
  leadOf: PracticeRef[];
  siteLead: boolean;
}

export const isManager = (actor: Actor) => actor.reportCount > 0;
export const isPracticeLead = (actor: Actor) => actor.leadOf.length > 0;
const leads = (actor: Actor, practiceId: string) => actor.leadOf.some((p) => p.id === practiceId);

export interface PersonRef {
  id: string;
  managerId: string | null;
  practiceId: string | null;
}

export type Scope =
  { kind: "team"; managerId: string } | { kind: "practice"; practiceId: string } | { kind: "site" };

/** Each action and the resource it is checked against (`undefined`: the action needs none). */
export interface Resources {
  /** open a named profile: the person, their manager, the Practice Leads of their practice. Never the Site Lead. */
  "profile:view": PersonRef;
  "profile:edit": { id: string };
  /** recommend a development step to a direct report */
  "recommendation:create": PersonRef;
  "recommendation:answer": { personId: string };
  /** aggregated gaps and readiness, and succession / bench strength, for a team, a practice or the site */
  "aggregates:view": Scope;
  "succession:view": Scope;
  "changeRequest:create": { practiceId: string };
  "changeRequest:view": { authorId: string | null; practiceId: string };
  "changeRequest:withdraw": { authorId: string | null };
  "changeRequest:review": { practiceId: string };
  /** roles, specialisations, requirements and paths of a practice */
  "role:edit": { practiceId: string };
  "catalogue:add": undefined;
  /** merge duplicates, maintain categories */
  "catalogue:manage": undefined;
  /** practices, Practice Leads, people and reporting lines */
  "site:manage": undefined;
  "audit:view": undefined;
}

export type Action = keyof Resources;
type ResourceArg<A extends Action> = Resources[A] extends undefined ? [] : [resource: Resources[A]];

const inScope = (actor: Actor, scope: Scope) =>
  scope.kind === "site"
    ? actor.siteLead
    : scope.kind === "practice"
      ? leads(actor, scope.practiceId) || actor.siteLead
      : isManager(actor) && scope.managerId === actor.userId;

const rules: { [A in Action]: (actor: Actor, resource: Resources[A]) => boolean } = {
  "profile:view": (a, p) =>
    p.id === a.userId || p.managerId === a.userId || (p.practiceId !== null && leads(a, p.practiceId)),
  "profile:edit": (a, p) => p.id === a.userId,
  "recommendation:create": (a, p) => p.managerId === a.userId && p.id !== a.userId,
  "recommendation:answer": (a, r) => r.personId === a.userId,
  "aggregates:view": inScope,
  "succession:view": inScope,
  // managers and Practice Leads send feedback; a Practice Lead may also send it to other practices
  "changeRequest:create": (a) => isManager(a) || isPracticeLead(a),
  "changeRequest:view": (a, r) => r.authorId === a.userId || leads(a, r.practiceId) || a.siteLead,
  "changeRequest:withdraw": (a, r) => r.authorId === a.userId,
  // the Site Lead only in an emergency (the audit log records it)
  "changeRequest:review": (a, r) => leads(a, r.practiceId) || a.siteLead,
  "role:edit": (a, r) => leads(a, r.practiceId) || a.siteLead,
  "catalogue:add": (a) => isPracticeLead(a) || a.siteLead,
  "catalogue:manage": (a) => a.siteLead,
  "site:manage": (a) => a.siteLead,
  "audit:view": (a) => a.siteLead,
};

/** The one place permissions are decided. Pages, server actions and API routes all call it. */
export function can<A extends Action>(actor: Actor, action: A, ...[resource]: ResourceArg<A>): boolean {
  return (rules[action] as (actor: Actor, resource: Resources[A] | undefined) => boolean)(actor, resource);
}
