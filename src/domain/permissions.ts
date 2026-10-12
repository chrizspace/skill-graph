import { can, isManager, type Actor, type PersonRef, type Scope } from "./access";

/** The four kinds of user (docs/PLAN.md §1). Everyone is an Employee; the others are added by the data, and add up. */
export const userTypes = ["employee", "manager", "practice_lead", "site_lead"] as const;
export type UserType = (typeof userTypes)[number];

export const userTypeLabel: Record<UserType, string> = {
  employee: "Employee",
  manager: "Manager",
  practice_lead: "Practice Lead",
  site_lead: "Site Lead",
};

export const userTypeSummary: Record<UserType, string> = {
  employee: "Everyone who signs in.",
  manager:
    "Has at least one direct report. The Site Lead makes someone a manager by giving them a direct report.",
  practice_lead: "Appointed to lead a practice by the Site Lead. A Practice Lead can also be a manager.",
  site_lead: "Oversees all practices and appoints Practice Leads.",
};

const PRACTICE = { id: "practice", slug: "practice", name: "Practice" };

/** A typical person of each type, with nothing else added, to ask `can()` what they may do. */
function typicalActor(type: UserType): Actor {
  return {
    userId: "me",
    name: "Me",
    email: "me@example.com",
    practiceId: PRACTICE.id,
    reportCount: type === "manager" ? 1 : 0,
    leadOf: type === "practice_lead" ? [PRACTICE] : [],
    siteLead: type === "site_lead",
  };
}

export interface PermissionRow {
  /** what a person may do */
  label: string;
  /** where it applies, or the catch: shown under the label */
  note?: string;
  allowed: Record<UserType, boolean>;
}
export interface PermissionGroup {
  label: string;
  rows: PermissionRow[];
}

const everyone = (): Record<UserType, boolean> => ({
  employee: true,
  manager: true,
  practice_lead: true,
  site_lead: true,
});
const ask = (check: (actor: Actor) => boolean): Record<UserType, boolean> =>
  Object.fromEntries(userTypes.map((t) => [t, check(typicalActor(t))])) as Record<UserType, boolean>;

const person = (over: Partial<PersonRef>): PersonRef => ({
  id: "someone",
  managerId: null,
  practiceId: null,
  ...over,
});
const team = (a: Actor): Scope => ({ kind: "team", managerId: a.userId });
const practice: Scope = { kind: "practice", practiceId: PRACTICE.id };
const site: Scope = { kind: "site" };

/**
 * What each type of user may do, as a table. Every row that is not true for everyone is answered by `can()` for a
 * typical person of that type, so this page can't disagree with the app. Read-only: permissions are decided in code.
 */
export function permissionMatrix(): PermissionGroup[] {
  return [
    {
      label: "Explore",
      rows: [
        {
          label: "Browse roles, the catalogue and the graph, and compare roles",
          allowed: everyone(),
        },
      ],
    },
    {
      label: "Own profile",
      rows: [
        {
          label: "Keep my profile, certifications and development plan",
          allowed: ask((a) => can(a, "profile:edit", { id: a.userId })),
        },
        {
          label: "Answer recommendations made to me",
          allowed: ask((a) => can(a, "recommendation:answer", { personId: a.userId })),
        },
      ],
    },
    {
      label: "People",
      rows: [
        {
          label: "Open the named profile of a direct report",
          allowed: ask((a) => isManager(a) && can(a, "profile:view", person({ managerId: a.userId }))),
        },
        {
          label: "Recommend a development step to a direct report",
          allowed: ask(
            (a) => isManager(a) && can(a, "recommendation:create", person({ managerId: a.userId })),
          ),
        },
        {
          label: "Open the named profile of a member of their practice",
          note: "Only the practices they lead.",
          allowed: ask((a) => can(a, "profile:view", person({ practiceId: PRACTICE.id }))),
        },
        {
          label: "Open the named profile of anyone else",
          note: "Nobody does: the Site Lead sees aggregates only.",
          allowed: ask((a) => can(a, "profile:view", person({ managerId: "other", practiceId: "other" }))),
        },
      ],
    },
    {
      label: "Gaps and succession",
      rows: [
        {
          label: "See the gaps and succession of their team",
          allowed: ask((a) => can(a, "aggregates:view", team(a)) && can(a, "succession:view", team(a))),
        },
        {
          label: "See the gaps and succession of their practice",
          note: "Groups under 5 people are hidden.",
          allowed: ask((a) => can(a, "aggregates:view", practice) && can(a, "succession:view", practice)),
        },
        {
          label: "See the gaps and succession of the whole site",
          note: "Groups under 5 people are hidden.",
          allowed: ask((a) => can(a, "aggregates:view", site) && can(a, "succession:view", site)),
        },
      ],
    },
    {
      label: "Roles and change requests",
      rows: [
        {
          label: "Send a change request or feedback on a role",
          allowed: ask((a) => can(a, "changeRequest:create", { practiceId: "other" })),
        },
        {
          label: "Review the change requests of their practice",
          note: "The Site Lead only steps in in an emergency.",
          allowed: ask((a) => can(a, "changeRequest:review", { practiceId: PRACTICE.id })),
        },
        {
          label: "Edit the roles, requirements and paths of their practice",
          allowed: ask((a) => can(a, "role:edit", { practiceId: PRACTICE.id })),
        },
        {
          label: "Edit the roles of another practice",
          note: "Only in an emergency, and the audit log records it.",
          allowed: ask((a) => can(a, "role:edit", { practiceId: "other" })),
        },
      ],
    },
    {
      label: "Catalogue and site",
      rows: [
        {
          label: "Add a skill or certification to the catalogue",
          allowed: ask((a) => can(a, "catalogue:add")),
        },
        {
          label: "Merge duplicates and maintain the catalogue",
          allowed: ask((a) => can(a, "catalogue:manage")),
        },
        {
          label: "Manage practices, appoint Practice Leads and make employees managers",
          note: "A person becomes a manager when the Site Lead gives them a direct report (reporting lines).",
          allowed: ask((a) => can(a, "site:manage")),
        },
        {
          label: "Read the audit log",
          allowed: ask((a) => can(a, "audit:view")),
        },
      ],
    },
  ];
}
