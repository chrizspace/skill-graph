import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriorityBadge, weightLabel } from "@/components/domain/priority-badge";
import { RequirementList } from "@/components/domain/requirement-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { roleDetail, type PathLink } from "@/domain/browse";
import { getGraph, getPractices } from "@/lib/graph-data";

// a static title: reading the graph here would need the database while the app is built
export const metadata: Metadata = { title: "Role · Skill Graph" };

const percent = (score: number) => `${Math.round(score * 100)}%`;

function Paths({ title, links, empty }: { title: string; links: PathLink[]; empty: string }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y">
          {links.map((l) => (
            <li key={`${l.via}-${l.other.label}`} className="py-2">
              <Link
                href={`/roles/${l.other.slug}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {l.other.label}
              </Link>
              {l.via && <span className="text-sm text-muted-foreground"> (from {l.via})</span>}
              {l.typicalMonths && (
                <span className="text-sm text-muted-foreground"> · typically {l.typicalMonths} months</span>
              )}
              {l.note && <p className="text-sm text-muted-foreground">{l.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function RolePage({ params }: PageProps<"/roles/[slug]">) {
  const { slug } = await params;
  const [graph, practices] = await Promise.all([getGraph(), getPractices()]);
  const detail = roleDetail(graph, slug);
  if (!detail) notFound();
  const { role, core, specializations, pathsOut, pathsIn, similar } = detail;
  const practice = practices.find((p) => p.id === role.practiceId);

  return (
    <article className="flex flex-col gap-8">
      <header>
        <p className="text-sm text-muted-foreground">
          <Link href="/roles" className="underline-offset-4 hover:underline">
            Roles
          </Link>
          {practice && (
            <>
              {" / "}
              <Link href={`/roles?practice=${practice.slug}`} className="underline-offset-4 hover:underline">
                {practice.name}
              </Link>
            </>
          )}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{role.name}</h1>
        {role.description && (
          <p className="mt-2 max-w-3xl text-lg text-muted-foreground">{role.description}</p>
        )}
        {practice && practice.leads.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {practice.name} · led by {practice.leads.join(", ")}
          </p>
        )}
      </header>

      <section aria-labelledby="core" className="flex flex-col gap-3">
        <h2 id="core" className="text-xl font-semibold">
          Core requirements
        </h2>
        <p className="text-sm text-muted-foreground">
          What everyone in this role needs, whatever their specialisation.
        </p>
        <div className="flex flex-wrap gap-3 text-sm" aria-label="Requirements by weight">
          {(["critical", "important", "nice"] as const).map((w) => (
            <span key={w} className="inline-flex items-center gap-1.5">
              <span className="font-semibold tabular-nums">{detail.coreByWeight[w].length}</span>
              <PriorityBadge weight={w} />
            </span>
          ))}
        </div>
        <RequirementList requirements={core} />
      </section>

      {specializations.length > 0 && (
        <section aria-labelledby="specializations" className="flex flex-col gap-3">
          <h2 id="specializations" className="text-xl font-semibold">
            Specialisations
          </h2>
          <p className="text-sm text-muted-foreground">
            Directions within the role. Each adds requirements on top of the core; moving from the core into
            one means gaining exactly what it adds.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {specializations.map(({ specialization, adds, raises }) => (
              <Card key={specialization.id}>
                <CardHeader>
                  <CardTitle>
                    {role.name}: {specialization.name}
                  </CardTitle>
                  {specialization.description && (
                    <CardDescription>{specialization.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">Adds</h3>
                  <RequirementList requirements={adds} empty="Nothing beyond the core." headingLevel={4} />
                  {raises.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Raises the weight of{" "}
                      {raises.map((r, i) => (
                        <span key={r.item.id}>
                          {i > 0 && ", "}
                          <strong className="font-medium text-foreground">{r.item.name}</strong> from{" "}
                          {weightLabel(r.from)} to {weightLabel(r.to)}
                        </span>
                      ))}
                      .
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="paths" className="flex flex-col gap-3">
        <h2 id="paths" className="text-xl font-semibold">
          Official paths
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Paths title="Where this role can lead" links={pathsOut} empty="No official path out yet." />
          <Paths title="Who moves into this role" links={pathsIn} empty="No official path in yet." />
        </div>
      </section>

      <section aria-labelledby="similar" className="flex flex-col gap-3">
        <h2 id="similar" className="text-xl font-semibold">
          Similar roles
        </h2>
        <p className="text-sm text-muted-foreground">
          Roles with an overlapping skillset, by the weight of the core requirements they share.
        </p>
        {similar.length === 0 ? (
          <p className="text-sm text-muted-foreground">No role is similar enough.</p>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {similar.map((s) => (
              <li key={s.role.id}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>
                      <Link href={`/roles/${s.role.slug}`} className="underline-offset-4 hover:underline">
                        {s.role.name}
                      </Link>{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        {percent(s.score)} in common
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 text-sm">
                    <p>
                      <span className="font-medium">Shared:</span>{" "}
                      {s.shared.map((x) => x.item.name).join(", ")}
                    </p>
                    {s.onlyThis.length > 0 && (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Only {role.name}:</span>{" "}
                        {s.onlyThis.map((x) => x.item.name).join(", ")}
                      </p>
                    )}
                    {s.onlyOther.length > 0 && (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Only {s.role.name}:</span>{" "}
                        {s.onlyOther.map((x) => x.item.name).join(", ")}
                      </p>
                    )}
                    <Link
                      href={`/compare?a=${role.slug}&b=${s.role.slug}`}
                      className="mt-1 w-fit underline underline-offset-4"
                    >
                      Compare {role.name} with {s.role.name}
                    </Link>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
