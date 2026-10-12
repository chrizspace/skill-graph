"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BuildingIcon, CompassIcon, FlagIcon, UserIcon, UsersIcon, type LucideIcon } from "lucide-react";
import { activeHref, type NavGroup } from "@/domain/navigation";
import { cn } from "@/lib/utils";

const icons: Record<NavGroup["id"], LucideIcon> = {
  me: UserIcon,
  explore: CompassIcon,
  team: UsersIcon,
  practice: FlagIcon,
  site: BuildingIcon,
};

/** The menu groups for a person's user types: a title with its links under it. The page they are on is marked with aria-current. */
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
      {groups.map((group) => {
        const Icon = icons[group.id];
        return (
          <div key={group.id} role="group" aria-labelledby={`nav-${group.id}`}>
            <p
              id={`nav-${group.id}`}
              className="mb-1 flex items-center gap-3 px-3 py-1 text-sm font-semibold"
            >
              <Icon aria-hidden className="size-5 shrink-0" />
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
                      "block rounded-md py-2 pr-3 pl-11 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      item.href === active && "bg-accent font-medium text-accent-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
