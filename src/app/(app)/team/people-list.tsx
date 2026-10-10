import Link from "next/link";
import { CertificationStatus } from "@/components/domain/certification-status";
import { ReadinessMeter } from "@/components/domain/readiness-meter";
import { PriorityBadge } from "@/components/domain/priority-badge";
import type { PersonData } from "@/db/people";
import type { PersonSummary } from "@/domain/people";

/** People at a glance: role, target, how they meet their role, what they still need, certifications to watch. */
export function PeopleList({
  people,
  summaries,
  hrefFor,
  empty,
}: {
  people: PersonData[];
  summaries: Map<string, PersonSummary>;
  hrefFor: (person: PersonData) => string;
  empty: string;
}) {
  if (people.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y rounded-lg border">
      {people.map((p) => {
        const s = summaries.get(p.id)!;
        return (
          <li
            key={p.id}
            className="grid gap-3 p-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,1fr)]"
          >
            <div>
              <Link href={hrefFor(p)} className="font-medium underline-offset-4 hover:underline">
                {p.name}
              </Link>
              <p className="text-sm text-muted-foreground">{s.currentLabel ?? "No role yet"}</p>
              {s.targetLabel && <p className="text-sm text-muted-foreground">Target: {s.targetLabel}</p>}
            </div>
            <div className="flex flex-col gap-2">
              {s.fit ? (
                <ReadinessMeter readiness={s.fit} label="Their role" />
              ) : (
                <p className="text-sm text-muted-foreground">No role to assess.</p>
              )}
              {s.targetFit && s.targetLabel && (
                <ReadinessMeter readiness={s.targetFit} label={`Towards ${s.targetLabel}`} />
              )}
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-medium">Still to learn</p>
              {s.topGaps.length === 0 ? (
                <p className="text-muted-foreground">Nothing missing for their role.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {s.topGaps.map((g) => (
                    <li key={g.item.id} className="flex flex-wrap items-center gap-2">
                      {g.item.name} <PriorityBadge weight={g.weight} />
                    </li>
                  ))}
                </ul>
              )}
              {s.alerts.map((a) => (
                <CertificationStatus
                  key={a.item.id}
                  name={a.item.name}
                  status={a.status}
                  expiresOn={a.expiresOn}
                  className="mt-1 text-sm"
                />
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
