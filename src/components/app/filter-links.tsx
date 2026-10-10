import Link from "next/link";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  href: string;
  active: boolean;
  /** how many results it gives, if known */
  count?: number;
}

/** A filter as a row of links (so it works without JavaScript and keeps the other filters in the URL). */
export function FilterLinks({ label, options }: { label: string; options: FilterOption[] }) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">{label}</span>
      <ul className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <li key={o.label}>
            <Link
              href={o.href}
              aria-current={o.active ? "true" : undefined}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-full border px-3 text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                o.active && "border-primary bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {o.label}
              {o.count !== undefined && <span className="text-xs opacity-80">{o.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
