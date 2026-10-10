"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeHref, type NavGroup } from "@/domain/navigation";
import { cn } from "@/lib/utils";

/** The menu groups for a person's user types; the page they are on is marked with aria-current. */
export function NavLinks({
  groups,
  onNavigate,
  className,
}: {
  groups: NavGroup[];
  onNavigate?: () => void;
  className?: string;
}) {
  const active = activeHref(groups, usePathname());
  return (
    <nav aria-label="Main" className={cn("flex flex-col gap-5", className)}>
      {groups.map((group) => (
        <div key={group.label} role="group" aria-labelledby={`nav-${group.label}`}>
          <p
            id={`nav-${group.label}`}
            className="mb-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={item.href === active ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    item.href === active && "bg-accent font-medium text-accent-foreground",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
