import Link from "next/link";
import { Check, Circle } from "lucide-react";
import type { AssessedItem } from "@/domain/assess";
import { CertificationStatus } from "./certification-status";
import { PriorityBadge } from "./priority-badge";

/** One assessed requirement: met (a tick) or still missing (an open circle), with its weight; certifications show their status. */
export function AssessedRow({
  row,
  state,
  expiresOn,
}: {
  row: AssessedItem;
  state: "met" | "missing";
  expiresOn?: string | null;
}) {
  const Icon = state === "met" ? Check : Circle;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2" data-state={state}>
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="sr-only">{state === "met" ? "Met:" : "Missing:"}</span>
      {row.certification ? (
        <CertificationStatus name={row.item.name} status={row.certification} expiresOn={expiresOn} />
      ) : (
        <Link href={`/catalogue/${row.item.slug}`} className="font-medium underline-offset-4 hover:underline">
          {row.item.name}
        </Link>
      )}
      <PriorityBadge weight={row.weight} />
    </li>
  );
}

/**
 * How a profile meets a role: what's missing (in learning order) and what's met. An expired certification is met,
 * shown faded with its expiry date; it's not a gap (docs/PLAN.md §1).
 */
export function AssessmentList({
  missing,
  met,
  expiry = {},
}: {
  missing: readonly AssessedItem[];
  met: readonly AssessedItem[];
  /** expiry dates of held certifications by item id */
  expiry?: Record<string, string | null>;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-labelledby="missing-heading">
        <h3 id="missing-heading" className="text-sm font-semibold">
          Still to learn ({missing.length})
        </h3>
        {missing.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Nothing missing.</p>
        ) : (
          <ul className="divide-y">
            {missing.map((r) => (
              <AssessedRow key={r.item.id} row={r} state="missing" />
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="met-heading">
        <h3 id="met-heading" className="text-sm font-semibold">
          Already met ({met.length})
        </h3>
        {met.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Nothing met yet.</p>
        ) : (
          <ul className="divide-y">
            {met.map((r) => (
              <AssessedRow key={r.item.id} row={r} state="met" expiresOn={expiry[r.item.id]} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
