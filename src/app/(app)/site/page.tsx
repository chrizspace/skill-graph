import { PriorityBadge } from "@/components/domain/priority-badge";
import { Progress } from "@/components/ui/progress";
import { getDb } from "@/db/client";
import { loadPeople } from "@/db/people";
import { profiles } from "@/db/schema";
import { thresholds } from "@/domain/config";
import { siteOverview, type GroupAggregate } from "@/domain/site";
import type { Group } from "@/domain/aggregates";
import { getGraph, getPractices } from "@/lib/graph-data";
import { requireCan } from "@/lib/session";

export const metadata = { title: "Site overview · Skill Graph" };

/** A count, or "fewer than 5" where it was withheld so it can't point at a person. */
const count = (n: number | null) => (n === null ? `fewer than ${thresholds.minGroupSize}` : String(n));

function Row({ name, sub, group }: { name: string; sub?: string | null; group: Group<GroupAggregate> }) {
  return (
    <tr className="border-b align-top">
      <th scope="row" className="py-3 pr-4 text-left font-medium">
        {name}
        {sub && <span className="block text-xs font-normal text-muted-foreground">{sub}</span>}
      </th>
      <td className="py-3 pr-4 tabular-nums">{group.size}</td>
      {group.hidden || !group.value ? (
        <td colSpan={3} className="py-3 text-muted-foreground">
          Fewer than {thresholds.minGroupSize} people: hidden, so nobody can be singled out.
        </td>
      ) : (
        <>
          <td className="w-48 py-3 pr-4">
            <Progress
              value={Math.round(group.value.averageFit * 100)}
              aria-label={`${name}: ${Math.round(group.value.averageFit * 100)}% on average`}
            />
            <span className="text-xs tabular-nums">{Math.round(group.value.averageFit * 100)}%</span>
          </td>
          <td className="py-3 pr-4 tabular-nums">{count(group.value.criticalMissing)}</td>
          <td className="py-3">
            {group.value.gaps.length === 0 ? (
              <span className="text-muted-foreground">None</span>
            ) : (
              <ul className="flex flex-col gap-1">
                {group.value.gaps.map((g) => (
                  <li key={g.item.id} className="flex flex-wrap items-center gap-2">
                    {g.item.name} <PriorityBadge weight={g.weight} />{" "}
                    <span className="text-xs text-muted-foreground">{count(g.count)} people</span>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </>
      )}
    </tr>
  );
}

function Table({ caption, first, children }: { caption: string; first: string; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b text-left text-xs text-muted-foreground uppercase">
          <tr>
            <th scope="col" className="py-2 pr-4 font-medium">
              {first}
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              People
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Meet their role (average)
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Missing a Critical requirement
            </th>
            <th scope="col" className="py-2 font-medium">
              Most missed
            </th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** The site at a glance, for the Site Lead: numbers only (docs/PLAN.md §1): groups under 5 people are hidden, nobody is named. */
export default async function Site() {
  await requireCan("aggregates:view", { kind: "site" });
  const db = getDb();
  const [graph, practices, ids] = await Promise.all([
    getGraph(),
    getPractices(),
    db.select({ id: profiles.userId }).from(profiles),
  ]);
  const people = await loadPeople(
    db,
    ids.map((r) => r.id),
  );
  const overview = siteOverview(graph, people, practices, new Date());
  // the roles somebody could take on now or is a stretch from; alphabetical, so the order doesn't hint at small numbers
  const bench = overview.bench
    .filter((b) => b.reachable !== 0 || b.stretch !== 0)
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="flex max-w-5xl flex-col gap-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Site overview</h1>
        <p className="mt-1 text-muted-foreground">
          {overview.people} people with a profile. Only numbers are shown here: groups of fewer than{" "}
          {thresholds.minGroupSize} people are hidden and nobody is named. Named profiles are for the person,
          their manager and their practice&apos;s leads.
        </p>
      </header>

      <section aria-labelledby="practices" className="flex flex-col gap-3">
        <h2 id="practices" className="text-xl font-semibold">
          Practices
        </h2>
        <Table caption="Readiness and gaps per practice" first="Practice">
          {overview.practices.map((g) => (
            <Row key={g.key} name={g.name} group={g} />
          ))}
        </Table>
      </section>

      <section aria-labelledby="roles" className="flex flex-col gap-3">
        <h2 id="roles" className="text-xl font-semibold">
          Roles
        </h2>
        <Table caption="Readiness and gaps per role" first="Role">
          {overview.roles.map((g) => (
            <Row key={g.key} name={g.name} sub={g.practiceName} group={g} />
          ))}
        </Table>
      </section>

      <section aria-labelledby="bench" className="flex flex-col gap-3">
        <h2 id="bench" className="text-xl font-semibold">
          Bench strength
        </h2>
        <p className="text-sm text-muted-foreground">
          How many people could take on each role now (every Critical requirement met and most of the rest),
          and how many are a stretch away. Counts only; a count under {thresholds.minGroupSize} is shown as
          &ldquo;fewer than {thresholds.minGroupSize}&rdquo;.
        </p>
        {bench.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not enough people yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full max-w-xl text-sm">
              <caption className="sr-only">People who could take on each role</caption>
              <thead className="border-b text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Role
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Could take it on now
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    A stretch
                  </th>
                </tr>
              </thead>
              <tbody>
                {bench.map((b) => (
                  <tr key={b.label} className="border-b">
                    <th scope="row" className="py-2 pr-4 text-left font-medium">
                      {b.label}
                    </th>
                    <td className="py-2 pr-4 tabular-nums">{count(b.reachable)}</td>
                    <td className="py-2 tabular-nums">{count(b.stretch)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
