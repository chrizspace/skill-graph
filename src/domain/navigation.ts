import { can, isManager, isPracticeLead, type Actor } from "./access";

export interface NavItem {
  label: string;
  href: string;
}
export interface NavGroup {
  id: "me" | "explore" | "team" | "practice" | "site";
  label: string;
  items: NavItem[];
}

/** The menu for a person: what everyone gets, plus a group for each user type they are (docs/PLAN.md §5). */
export function navigationFor(actor: Actor): NavGroup[] {
  const groups: NavGroup[] = [
    {
      id: "me",
      label: "My Skills",
      items: [
        { label: "My profile", href: "/me" },
        { label: "My development plan", href: "/me/plan" },
      ],
    },
    {
      id: "explore",
      label: "Explore Skills",
      items: [
        { label: "Home", href: "/" },
        { label: "Roles", href: "/roles" },
        { label: "Catalogue", href: "/catalogue" },
        { label: "Graph", href: "/explore" },
        { label: "Compare", href: "/compare" },
      ],
    },
  ];
  // Career Advisors and Practice Leads send and review change requests; the Site Lead can step in (docs/PLAN.md §1)
  if (can(actor, "changeRequest:create", { practiceId: "" }) || actor.siteLead) {
    groups[1].items.push({ label: "Change requests", href: "/requests" });
  }
  if (isManager(actor)) {
    groups.push({
      id: "team",
      label: "Manage Team",
      items: [
        { label: "My team", href: "/team" },
        { label: "Succession", href: "/team/succession" },
      ],
    });
  }
  if (isPracticeLead(actor)) {
    groups.push({
      id: "practice",
      label: "Lead Practice",
      items: actor.leadOf.map((p) => ({ label: p.name, href: `/practices/${p.slug}` })),
    });
  }
  if (can(actor, "site:manage")) {
    groups.push({
      id: "site",
      label: "Organize Site",
      items: [
        { label: "Overview", href: "/site" },
        { label: "Practices", href: "/site/practices" },
        { label: "People", href: "/site/people" },
        { label: "Catalogue", href: "/site/catalogue" },
        { label: "Permissions", href: "/site/permissions" },
        { label: "Audit log", href: "/site/audit" },
      ],
    });
  }
  return groups;
}

/** The item whose link best matches the current path (longest prefix wins), for aria-current. */
export function activeHref(groups: NavGroup[], pathname: string): string | null {
  const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
  const matches = hrefs.filter((h) =>
    h === "/" ? pathname === "/" : pathname === h || pathname.startsWith(`${h}/`),
  );
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}
