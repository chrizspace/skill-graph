import Link from "next/link";
import { Star } from "lucide-react";
import type { PlanStep } from "@/domain/plan";
import { ItemTypeBadge } from "./item-type-badge";
import { PriorityBadge } from "./priority-badge";
import type { CatalogueType } from "@/domain/graph";

/** The development plan: what's missing for the target, numbered in learning order; recommended steps are marked. */
export function PlanSteps({ steps }: { steps: readonly PlanStep[] }) {
  if (steps.length === 0)
    return <p className="text-sm text-muted-foreground">Nothing left to learn for this target.</p>;
  return (
    <ol className="divide-y">
      {steps.map((s, i) => (
        <li key={s.item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
          <span aria-hidden className="w-6 text-sm text-muted-foreground tabular-nums">
            {i + 1}.
          </span>
          <Link href={`/catalogue/${s.item.slug}`} className="font-medium underline-offset-4 hover:underline">
            {s.item.name}
          </Link>
          <ItemTypeBadge type={s.item.type as CatalogueType} />
          <PriorityBadge weight={s.weight} />
          {s.recommended && (
            <span className="inline-flex items-center gap-1 text-xs font-medium">
              <Star aria-hidden className="size-3.5" />
              Recommended by your manager
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
