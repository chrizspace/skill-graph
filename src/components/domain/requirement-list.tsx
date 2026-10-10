import Link from "next/link";
import { catalogueTypes, type CatalogueType, type Requirement } from "@/domain/graph";
import { itemTypeLabel } from "./item-type-badge";
import { PriorityBadge } from "./priority-badge";

const headings: Record<CatalogueType, string> = {
  technical_skill: "Technical skills",
  soft_skill: "Soft skills",
  certification: "Certifications",
};

/** One requirement per row: the item (linked to its catalogue page), its type, its weight and why it matters. */
export function RequirementRow({ requirement }: { requirement: Requirement }) {
  const { item, weight, note } = requirement;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2" data-weight={weight}>
      <Link href={`/catalogue/${item.slug}`} className="font-medium underline-offset-4 hover:underline">
        {item.name}
      </Link>
      <PriorityBadge weight={weight} />
      {note && <span className="basis-full text-sm text-muted-foreground">{note}</span>}
    </li>
  );
}

/**
 * Requirements grouped by type (technical skills, soft skills, certifications), each group ordered by weight.
 * Pass requirements already sorted by weight, as `requirementsOf` returns them.
 */
export function RequirementList({
  requirements,
  empty = "No requirements yet.",
  headingLevel = 3,
}: {
  requirements: readonly Requirement[];
  empty?: string;
  /** the level of the group headings, so the page's heading order stays unbroken */
  headingLevel?: 3 | 4;
}) {
  const Heading = `h${headingLevel}` as const;
  if (requirements.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-col gap-4">
      {catalogueTypes.map((type) => {
        const rows = requirements.filter((r) => r.item.type === type);
        if (rows.length === 0) return null;
        return (
          <section key={type} aria-label={itemTypeLabel(type)}>
            <Heading className="flex items-center gap-2 text-sm font-semibold">
              {headings[type]} <span className="font-normal text-muted-foreground">({rows.length})</span>
            </Heading>
            <ul className="divide-y">
              {rows.map((r) => (
                <RequirementRow key={r.item.id} requirement={r} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
