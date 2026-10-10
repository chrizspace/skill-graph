import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemTypeBadge } from "@/components/domain/item-type-badge";
import { PriorityBadge } from "@/components/domain/priority-badge";
import { itemDetail } from "@/domain/browse";
import { weights, type CatalogueType, type GraphNode } from "@/domain/graph";
import { getGraph } from "@/lib/graph-data";

// a static title: reading the graph here would need the database while the app is built
export const metadata: Metadata = { title: "Catalogue item · Skill Graph" };

function ItemLinks({ title, items }: { title: string; items: GraphNode[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map((i) => (
          <li key={i.id}>
            <Link href={`/catalogue/${i.slug}`} className="underline underline-offset-4">
              {i.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ItemPage({ params }: PageProps<"/catalogue/[slug]">) {
  const { slug } = await params; // first: while prerendering this postpones, before the database is needed
  const detail = itemDetail(await getGraph(), slug);
  if (!detail) notFound();
  const { item, usedBy, usedByCount, buildsOn, requiredFor, related } = detail;

  return (
    <article className="flex flex-col gap-8">
      <header>
        <p className="text-sm text-muted-foreground">
          <Link href="/catalogue" className="underline-offset-4 hover:underline">
            Catalogue
          </Link>
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{item.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <ItemTypeBadge type={item.type as CatalogueType} />
          {item.category && <span>{item.category}</span>}
          {item.issuer && <span>Issued by {item.issuer}</span>}
        </div>
        {item.description && (
          <p className="mt-3 max-w-3xl text-lg text-muted-foreground">{item.description}</p>
        )}
      </header>

      <section aria-labelledby="needed" className="flex flex-col gap-3">
        <h2 id="needed" className="text-xl font-semibold">
          Roles that need it
        </h2>
        {usedByCount === 0 ? (
          <p className="text-sm text-muted-foreground">No role requires it yet.</p>
        ) : (
          weights.map((w) =>
            usedBy[w].length === 0 ? null : (
              <div key={w} className="flex flex-col gap-1">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <PriorityBadge weight={w} />{" "}
                  <span className="font-normal text-muted-foreground">({usedBy[w].length})</span>
                </h3>
                <ul className="divide-y">
                  {usedBy[w].map((u) => (
                    <li key={u.label} className="py-2">
                      <Link
                        href={`/roles/${u.roleSlug}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {u.label}
                      </Link>
                      {u.note && <p className="text-sm text-muted-foreground">{u.note}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )
        )}
      </section>

      {(buildsOn.length > 0 || requiredFor.length > 0 || related.length > 0) && (
        <section aria-labelledby="connections" className="flex flex-col gap-3">
          <h2 id="connections" className="text-xl font-semibold">
            Connections
          </h2>
          <ItemLinks title="Builds on (learn these first)" items={buildsOn} />
          <ItemLinks title="Builds on it" items={requiredFor} />
          <ItemLinks title="Related" items={related} />
        </section>
      )}
    </article>
  );
}
