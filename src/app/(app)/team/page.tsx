import Link from "next/link";
import { PriorityBadge } from "@/components/domain/priority-badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { directReportIds, loadPeople } from "@/db/people";
import { summarize, teamGaps } from "@/domain/people";
import { getGraph } from "@/lib/graph-data";
import { requireTeam } from "@/lib/session";
import { PeopleList } from "./people-list";

export const metadata = { title: "My team · Skill Graph" };

export default async function Team() {
  const actor = await requireTeam();
  const db = getDb();
  const [graph, people] = await Promise.all([
    getGraph(),
    directReportIds(db, actor.userId).then((ids) => loadPeople(db, ids)),
  ]);
  const today = new Date();
  const summaries = new Map(people.map((p) => [p.id, summarize(graph, p, today)]));
  const gaps = teamGaps(graph, people, today).slice(0, 8);
  const name = new Map(people.map((p) => [p.id, p.name]));

  return (
    <div className="flex max-w-5xl flex-col gap-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My team</h1>
          <p className="mt-1 text-muted-foreground">
            {people.length} {people.length === 1 ? "person" : "people"} report to you. Only you, they and the
            Practice Leads of their practice see these profiles.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/team/succession">Succession</Link>
        </Button>
      </header>

      <section aria-labelledby="gaps" className="flex flex-col gap-3">
        <h2 id="gaps" className="text-xl font-semibold">
          Gaps across the team
        </h2>
        <p className="text-sm text-muted-foreground">
          Critical and Important requirements of people&apos;s roles and targets that they don&apos;t have
          yet.
        </p>
        {gaps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shared gaps.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {gaps.map((g) => (
              <li key={g.item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
                <Link
                  href={`/catalogue/${g.item.slug}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {g.item.name}
                </Link>
                <PriorityBadge weight={g.weight} />
                <span className="text-sm">
                  {g.people.length} of {people.length} {people.length === 1 ? "person" : "people"}
                </span>
                <span className="text-sm text-muted-foreground">
                  {g.people.map((id) => name.get(id)).join(", ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="people" className="flex flex-col gap-3">
        <h2 id="people" className="text-xl font-semibold">
          People
        </h2>
        <PeopleList
          people={people}
          summaries={summaries}
          hrefFor={(p) => `/team/${p.id}`}
          empty="Nobody reports to you yet."
        />
      </section>
    </div>
  );
}
