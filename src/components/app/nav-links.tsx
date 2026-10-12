"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BuildingIcon,
  ChevronDownIcon,
  CompassIcon,
  FlagIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { activeHref, type NavGroup } from "@/domain/navigation";
import { cn } from "@/lib/utils";

const icons: Record<NavGroup["id"], LucideIcon> = {
  me: UserIcon,
  explore: CompassIcon,
  team: UsersIcon,
  practice: FlagIcon,
  site: BuildingIcon,
};

/**
 * The menu groups for a person's user types. Each group opens and closes (all start open); going to a page inside a
 * closed group opens it. The page they are on is marked with aria-current.
 */
export function NavLinks({
  groups,
  onNavigate,
  className,
}: {
  groups: NavGroup[];
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const active = activeHref(groups, pathname);
  const [closed, setClosed] = useState<ReadonlySet<NavGroup["id"]>>(new Set());
  // arriving on a page inside a closed group opens that group
  const [seen, setSeen] = useState(pathname);
  if (seen !== pathname) {
    setSeen(pathname);
    const holder = groups.find((g) => g.items.some((i) => i.href === active));
    if (holder && closed.has(holder.id)) {
      const next = new Set(closed);
      next.delete(holder.id);
      setClosed(next);
    }
  }
  const toggle = (id: NavGroup["id"]) => {
    const next = new Set(closed);
    if (!next.delete(id)) next.add(id);
    setClosed(next);
  };

  return (
    <nav aria-label="Main" className={cn("flex flex-col gap-1", className)}>
      {groups.map((group) => {
        const open = !closed.has(group.id);
        const Icon = icons[group.id];
        const holdsActive = group.items.some((i) => i.href === active);
        return (
          <div key={group.id} role="group" aria-labelledby={`nav-${group.id}`}>
            <button
              type="button"
              id={`nav-${group.id}`}
              aria-expanded={open}
              aria-controls={`nav-${group.id}-items`}
              onClick={() => toggle(group.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                holdsActive && !open && "bg-accent text-accent-foreground",
              )}
            >
              <Icon aria-hidden className="size-5 shrink-0" />
              <span className="flex-1">{group.label}</span>
              <ChevronDownIcon
                aria-hidden
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  !open && "-rotate-90",
                )}
              />
            </button>
            <ul id={`nav-${group.id}-items`} hidden={!open} className="mt-0.5 mb-2 flex flex-col gap-0.5">
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
