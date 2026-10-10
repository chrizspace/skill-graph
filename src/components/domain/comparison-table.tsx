import Link from "next/link";
import type { ComparisonRow } from "@/domain/assess";
import { weightLabel } from "./priority-badge";
import { PriorityBadge } from "./priority-badge";

function Has({ row }: { row: ComparisonRow }) {
  if (row.has === undefined) return null;
  if (row.certification === "expired")
    return <span className="text-sm text-muted-foreground">Held (expired)</span>;
  return row.has ? (
    <span className="text-sm font-medium text-success">Have it</span>
  ) : (
    <span className="text-sm font-medium text-foreground">To learn</span>
  );
}

function Rows({ rows, columns }: { rows: readonly ComparisonRow[]; columns: "both" | "a" | "b" }) {
  return (
    <ul className="divide-y">
      {rows.map((r) => (
        <li key={r.item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
          <Link
            href={`/catalogue/${r.item.slug}`}
            className="min-w-40 font-medium underline-offset-4 hover:underline"
          >
            {r.item.name}
          </Link>
          {columns === "both" && r.weightA && r.weightB && (
            <span className="text-sm text-muted-foreground">
              {r.weightA === r.weightB ? (
                <PriorityBadge weight={r.weightB} />
              ) : (
                <>
                  {weightLabel(r.weightA)} → {weightLabel(r.weightB)}
                </>
              )}
            </span>
          )}
          {columns === "b" && r.weightB && <PriorityBadge weight={r.weightB} />}
          {columns === "a" && r.weightA && <PriorityBadge weight={r.weightA} />}
          <Has row={r} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Two roles side by side: what they share, what moving to the second adds, and what the second no longer needs.
 * With a profile every shared and added row says whether the person has it or still has to learn it.
 */
export function ComparisonTable({
  fromLabel,
  toLabel,
  shared,
  onlyTo,
  onlyFrom,
}: {
  fromLabel: string;
  toLabel: string;
  shared: readonly ComparisonRow[];
  onlyTo: readonly ComparisonRow[];
  onlyFrom: readonly ComparisonRow[];
}) {
  const sections = [
    {
      id: "shared",
      title: `Both need (${shared.length})`,
      hint: "The weight in each role, if it differs.",
      rows: shared,
      columns: "both" as const,
    },
    {
      id: "adds",
      title: `Moving to ${toLabel} adds (${onlyTo.length})`,
      hint: undefined,
      rows: onlyTo,
      columns: "b" as const,
    },
    {
      id: "drops",
      title: `${toLabel} doesn't need (${onlyFrom.length})`,
      hint: `Required for ${fromLabel} only.`,
      rows: onlyFrom,
      columns: "a" as const,
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      {sections.map((s) => (
        <section key={s.id} aria-labelledby={`cmp-${s.id}`}>
          <h3 id={`cmp-${s.id}`} className="text-sm font-semibold">
            {s.title}
          </h3>
          {s.hint && <p className="text-xs text-muted-foreground">{s.hint}</p>}
          {s.rows.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Nothing.</p>
          ) : (
            <Rows rows={s.rows} columns={s.columns} />
          )}
        </section>
      ))}
    </div>
  );
}
