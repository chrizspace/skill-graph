import Link from "next/link";
import { ReadinessMeter } from "@/components/domain/readiness-meter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { PersonData } from "@/db/people";
import type { PracticeInfo } from "@/db/graph";
import { closestTo } from "@/domain/aggregates";
import { targetLabel, type Graph } from "@/domain/graph";
import { targetBySlug } from "@/domain/profile-input";
import { TargetSelect } from "../target-select";

/** Succession: who in these people is closest to a given role, best fit first (docs/PLAN.md §1 "Manager"). */
export function Succession({
  graph,
  practices,
  people,
  roleSlug,
  action,
  hrefFor,
  intro,
}: {
  graph: Graph;
  practices: PracticeInfo[];
  people: PersonData[];
  roleSlug: string | undefined;
  /** where the role picker sends its choice */
  action: string;
  hrefFor: (person: PersonData) => string;
  intro: string;
}) {
  const target = roleSlug ? targetBySlug(graph, roleSlug) : null;
  const ranked = target ? closestTo(graph, people, target) : [];
  const byId = new Map(people.map((p) => [p.id, p]));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Succession</h1>
        <p className="mt-1 text-muted-foreground">{intro}</p>
      </header>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="succession-role">Role</Label>
          <div className="w-72 max-w-full">
            <TargetSelect
              graph={graph}
              practices={practices}
              id="succession-role"
              name="role"
              label="Role"
              defaultValue={roleSlug}
            />
          </div>
        </div>
        <Button type="submit">Show who is closest</Button>
      </form>
      {target ? (
        <section aria-labelledby="ranking" className="flex flex-col gap-3">
          <h2 id="ranking" className="text-xl font-semibold">
            Closest to {targetLabel(graph, target)}
          </h2>
          {ranked.length === 0 ? (
            <p className="text-muted-foreground">There is nobody to compare.</p>
          ) : (
            <ol className="divide-y rounded-lg border">
              {ranked.map((r, i) => {
                const p = byId.get(r.personId)!;
                return (
                  <li key={r.personId} className="flex flex-wrap items-center gap-4 p-3">
                    <span aria-hidden className="w-6 text-sm text-muted-foreground tabular-nums">
                      {i + 1}.
                    </span>
                    <div className="min-w-40">
                      <Link href={hrefFor(p)} className="font-medium underline-offset-4 hover:underline">
                        {p.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {p.profile.current ? targetLabel(graph, p.profile.current) : "No role yet"}
                      </p>
                    </div>
                    <div className="min-w-56 flex-1">
                      <ReadinessMeter readiness={r.readiness} label={`For ${targetLabel(graph, target)}`} />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ) : (
        <p className="text-muted-foreground">Choose a role to see who is closest to it.</p>
      )}
    </div>
  );
}
