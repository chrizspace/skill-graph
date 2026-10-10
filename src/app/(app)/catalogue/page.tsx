import Link from "next/link";
import { FilterLinks } from "@/components/app/filter-links";
import { ItemTypeBadge, itemTypeLabel } from "@/components/domain/item-type-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { browseCatalogue, catalogueCategories } from "@/domain/browse";
import { catalogueTypes, type CatalogueType } from "@/domain/graph";
import { can } from "@/domain/access";
import { getGraph } from "@/lib/graph-data";
import { getActor } from "@/lib/session";
import { AddItem } from "./add-item";
import { hrefWith, param } from "@/lib/query";

export const metadata = { title: "Catalogue · Skill Graph" };

export default async function Catalogue({ searchParams }: PageProps<"/catalogue">) {
  const sp = await searchParams;
  const query = param(sp.q);
  const type = catalogueTypes.find((t) => t === param(sp.type));
  const graph = await getGraph();
  const actor = await getActor();
  const categories = catalogueCategories(graph, type);
  const category = categories.find((c) => c === param(sp.category));
  const current = { q: query, type, category };

  const results = browseCatalogue(graph, { query, type, category });
  const countOf = (t?: CatalogueType) => browseCatalogue(graph, { query, type: t, category }).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Catalogue</h1>
        <p className="mt-1 text-muted-foreground">
          The technical skills, soft skills and certifications that roles ask for, shared by the whole site.
        </p>
      </div>

      <form action="/catalogue" role="search" className="flex max-w-xl gap-2">
        {type && <input type="hidden" name="type" value={type} />}
        {category && <input type="hidden" name="category" value={category} />}
        <Input
          type="search"
          name="q"
          defaultValue={query}
          aria-label="Search the catalogue"
          placeholder="Search, e.g. SQL or Azure"
        />
        <Button type="submit">Search</Button>
      </form>

      <FilterLinks
        label="Type"
        options={[
          {
            label: "All",
            href: hrefWith("/catalogue", current, { type: undefined, category: undefined }),
            active: !type,
            count: countOf(),
          },
          ...catalogueTypes.map((t) => ({
            label: itemTypeLabel(t),
            href: hrefWith("/catalogue", current, { type: t, category: undefined }),
            active: t === type,
            count: countOf(t),
          })),
        ]}
      />
      {categories.length > 0 && (
        <FilterLinks
          label="Category"
          options={[
            {
              label: "All",
              href: hrefWith("/catalogue", current, { category: undefined }),
              active: !category,
            },
            ...categories.map((c) => ({
              label: c,
              href: hrefWith("/catalogue", current, { category: c }),
              active: c === category,
            })),
          ]}
        />
      )}

      <p aria-live="polite" className="text-sm text-muted-foreground">
        {results.length} {results.length === 1 ? "item" : "items"}
        {query && <> matching “{query}”</>}
      </p>

      {results.length === 0 ? (
        <p>
          No items found.{" "}
          <Link href="/catalogue" className="underline underline-offset-4">
            Clear the filters
          </Link>
        </p>
      ) : (
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {results.map(({ item, neededBy, critical }) => (
            <li key={item.id} className="flex items-baseline justify-between gap-3 border-b py-2">
              <div className="min-w-0">
                <Link
                  href={`/catalogue/${item.slug}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {item.name}
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                  <ItemTypeBadge type={item.type as CatalogueType} />
                  {item.category && <span>{item.category}</span>}
                  {item.issuer && <span>{item.issuer}</span>}
                </div>
              </div>
              <span className="shrink-0 text-sm text-muted-foreground">
                {neededBy === 0 ? "no role needs it" : `${neededBy} ${neededBy === 1 ? "role" : "roles"}`}
                {critical > 0 && <>, {critical} critical</>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {actor && can(actor, "catalogue:add") && <AddItem />}
    </div>
  );
}
