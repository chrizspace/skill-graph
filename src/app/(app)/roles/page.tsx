import Link from "next/link";
import { FilterLinks } from "@/components/app/filter-links";
import { RoleCard } from "@/components/domain/role-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { browseRoles } from "@/domain/browse";
import { getGraph, getPractices } from "@/lib/graph-data";
import { hrefWith, param } from "@/lib/query";

export const metadata = { title: "Roles · Skill Graph" };

export default async function Roles({ searchParams }: PageProps<"/roles">) {
  const sp = await searchParams;
  const query = param(sp.q);
  const practiceSlug = param(sp.practice);
  const [graph, practices] = await Promise.all([getGraph(), getPractices()]);
  const practice = practices.find((p) => p.slug === practiceSlug);
  const current = { q: query, practice: practice?.slug };

  const results = browseRoles(graph, { query, practiceId: practice?.id });
  // the counts per practice follow the search, so a filter never leads to an empty page by surprise
  const counts = new Map(
    practices.map((p) => [p.id, browseRoles(graph, { query, practiceId: p.id }).length]),
  );
  const practiceOf = new Map(practices.map((p) => [p.id, p.name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
        <p className="mt-1 text-muted-foreground">
          What each role needs, which specialisations it has and where it can lead.
        </p>
      </div>

      <form action="/roles" role="search" className="flex max-w-xl gap-2">
        {practice && <input type="hidden" name="practice" value={practice.slug} />}
        <Input
          type="search"
          name="q"
          defaultValue={query}
          aria-label="Search roles"
          placeholder="Search roles, e.g. scrum or React"
        />
        <Button type="submit">Search</Button>
      </form>

      <FilterLinks
        label="Practice"
        options={[
          { label: "All", href: hrefWith("/roles", current, { practice: undefined }), active: !practice },
          ...practices.map((p) => ({
            label: p.name,
            href: hrefWith("/roles", current, { practice: p.slug }),
            active: p.slug === practice?.slug,
            count: counts.get(p.id),
          })),
        ]}
      />

      <p aria-live="polite" className="text-sm text-muted-foreground">
        {results.length} {results.length === 1 ? "role" : "roles"}
        {query && <> matching “{query}”</>}
        {practice && <> in {practice.name}</>}
      </p>

      {results.length === 0 ? (
        <p>
          No roles found.{" "}
          <Link href="/roles" className="underline underline-offset-4">
            Clear the filters
          </Link>
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(({ role, coreCounts, specializations }) => (
            <li key={role.id}>
              <RoleCard
                name={role.name}
                slug={role.slug}
                practice={role.practiceId ? (practiceOf.get(role.practiceId) ?? null) : null}
                description={role.description ?? ""}
                coreCounts={coreCounts}
                specializations={specializations.map((s) => s.name)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
