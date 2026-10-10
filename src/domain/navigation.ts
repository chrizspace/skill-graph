import { can, isManager, isPracticeLead, type Actor } from "./access";

export interface NavItem {
  label: string;
  href: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** The menu for a person: what everyone gets, plus a group for each user type they are (docs/PLAN.md §5). */
export function navigationFor(actor: Actor): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: "Explore",
      items: [
        { label: "Home", href: "/" },
        { label: "Roles", href: "/roles" },
        { label: "Catalogue", href: "/catalogue" },
        { label: "Graph", href: "/explore" },
        { label: "Compare", href: "/compare" },
      ],
    },
    {
      label: "Me",
      items: [
        { label: "My profile", href: "/me" },
        { label: "My development plan", href: "/me/plan" },
      ],
    },
  ];
  if (isManager(actor)) {
    groups.push({
      label: "Team",
      items: [
        { label: "My team", href: "/team" },
        { label: "Succession", href: "/team/succession" },
      ],
    });
  }
  if (isPracticeLead(actor)) {
    groups.push({
      label: "Practice",
      items: actor.leadOf.map((p) => ({ label: p.name, href: `/practices/${p.slug}` })),
    });
  }
  if (can(actor, "changeRequest:create", { practiceId: "" })) {
    groups.push({ label: "Requests", items: [{ label: "Change requests", href: "/requests" }] });
  }
  if (can(actor, "site:manage")) {
    groups.push({
      label: "Site",
      items: [
        { label: "Overview", href: "/site" },
        { label: "Practices", href: "/site/practices" },
        { label: "People", href: "/site/people" },
        { label: "Catalogue", href: "/site/catalogue" },
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
