import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeightCounts } from "@/domain/browse";
import { PriorityBadge } from "./priority-badge";

/** A role in the browser: name, practice, what it does, how much its core asks for, and its specialisations. */
export function RoleCard({
  name,
  slug,
  practice,
  description,
  coreCounts,
  specializations,
}: {
  name: string;
  slug: string;
  practice: string | null;
  description: string;
  coreCounts: WeightCounts;
  specializations: string[];
}) {
  return (
    <Card className="relative h-full focus-within:ring-2 focus-within:ring-ring">
      <CardHeader>
        <CardTitle className="text-lg">
          {/* the whole card is the link: its ::after covers the card */}
          <Link href={`/roles/${slug}`} className="outline-none after:absolute after:inset-0">
            {name}
          </Link>
        </CardTitle>
        {practice && <CardDescription>{practice}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {description && <p className="line-clamp-3 text-sm text-muted-foreground">{description}</p>}
        <div className="flex flex-wrap gap-1" aria-label="Core requirements by weight">
          {(["critical", "important", "nice"] as const).map(
            (w) =>
              coreCounts[w] > 0 && (
                <span key={w} className="inline-flex items-center gap-1 text-xs">
                  <span className="font-semibold tabular-nums">{coreCounts[w]}</span>
                  <PriorityBadge weight={w} />
                </span>
              ),
          )}
        </div>
        {specializations.length > 0 && (
          <p className="text-xs text-muted-foreground">Specialisations: {specializations.join(", ")}</p>
        )}
      </CardContent>
    </Card>
  );
}
