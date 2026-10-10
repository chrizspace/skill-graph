import Link from "next/link";
import { ItemTypeBadge } from "@/components/domain/item-type-badge";
import { PriorityBadge } from "@/components/domain/priority-badge";
import { Button } from "@/components/ui/button";
import { itemDetail, roleDetail } from "@/domain/browse";
import { neighbours, weightFor, type MyState, type Neighbour } from "@/domain/explore";
import { isCatalogue, node, type CatalogueType, type EdgeKind, type Graph } from "@/domain/graph";
import { TYPE_LABEL } from "@/lib/graph-style";

const STATE_TEXT: Record<MyState, string> = {
  met: "You have this.",
  expiring: "You hold this; it expires soon.",
  expired: "You hold this; it has expired (it still counts).",
  missing: "You don't have this yet.",
};

const GROUPS: { kind: EdgeKind; direction: "out" | "in"; title: (isRole: boolean) => string }[] = [
  { kind: "requires", direction: "out", title: () => "Requires" },
  { kind: "requires", direction: "in", title: () => "Roles that need this" },
  { kind: "builds_on", direction: "out", title: () => "Builds on (learn first)" },
  { kind: "builds_on", direction: "in", title: () => "Builds on it" },
  { kind: "next_step", direction: "out", title: () => "Official paths out" },
  { kind: "next_step", direction: "in", title: () => "Official paths in" },
  { kind: "related_to", direction: "out", title: () => "Related" },
  { kind: "related_to", direction: "in", title: () => "Related" },
];

function Connections({ items, onFocus }: { items: Neighbour[]; onFocus: (id: string) => void }) {
  return (
    <ul className="flex flex-col">
      {items.map((n) => (
        <li
          key={`${n.kind}-${n.direction}-${n.node.id}`}
          className="flex flex-wrap items-center gap-2 py-0.5"
        >
          <button
            type="button"
            onClick={() => onFocus(n.node.id)}
            className="rounded-sm text-left underline underline-offset-4 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {n.node.name}
          </button>
          {n.weight && <PriorityBadge weight={n.weight} />}
        </li>
      ))}
    </ul>
  );
}

/**
 * The details of the selected node (docs/PLAN.md §6): what it is, its weight in the role in focus, its connections
 * grouped by kind (each one moves the graph's focus), the roles that need it, and for a role its specialisations and
 * similar roles. Everything here is a button or a link, so it works by keyboard alone.
 */
export function GraphPanel({
  graph,
  selectedId,
  focusId,
  states,
  selectedSpecs,
  onFocus,
  onToggleSpec,
}: {
  graph: Graph;
  selectedId: string | null;
  focusId: string | null;
  states?: ReadonlyMap<string, MyState>;
  selectedSpecs: readonly string[];
  onFocus: (id: string) => void;
  onToggleSpec: (id: string) => void;
}) {
  if (!selectedId || !graph.nodes.has(selectedId)) {
    return (
      <aside aria-label="Details" className="rounded-lg border p-4 text-sm text-muted-foreground">
        Select a role, skill or certification to see what it is and how it connects. Double-click one, or
        choose &ldquo;Focus here&rdquo;, to look at its neighbourhood.
      </aside>
    );
  }
  const n = node(graph, selectedId);
  const isItem = isCatalogue(n);
  const role = n.type === "specialization" ? node(graph, n.parentRoleId!) : n;
  const detail = !isItem ? roleDetail(graph, role.slug) : null;
  const item = isItem ? itemDetail(graph, n.slug) : null;
  const weight = focusId && isItem && focusId !== n.id ? weightFor(graph, focusId, n.id) : null;
  const state = states?.get(n.id);
  const links = neighbours(graph, n.id);
  const page = isItem ? `/catalogue/${n.slug}` : `/roles/${role.slug}`;
  const label = n.type === "specialization" ? `${role.name}: ${n.name}` : n.name;

  return (
    <aside aria-label="Details" className="flex flex-col gap-4 rounded-lg border p-4 text-sm">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{label}</h2>
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
          {isItem ? <ItemTypeBadge type={n.type as CatalogueType} /> : <span>{TYPE_LABEL[n.type]}</span>}
          {n.category && <span>· {n.category}</span>}
          {n.issuer && <span>· {n.issuer}</span>}
        </div>
        {weight && (
          <p className="flex items-center gap-2">
            For the role in focus: <PriorityBadge weight={weight} />
          </p>
        )}
        {state && <p>{STATE_TEXT[state]}</p>}
      </header>
      {n.description && <p className="text-muted-foreground">{n.description}</p>}

      <div className="flex flex-wrap gap-2">
        {focusId !== n.id && (
          <Button type="button" size="sm" onClick={() => onFocus(n.id)}>
            Focus here
          </Button>
        )}
        <Button asChild size="sm" variant="outline">
          <Link href={page}>Open page</Link>
        </Button>
        {!isItem && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/compare?b=${n.slug}`}>Compare with my role</Link>
          </Button>
        )}
      </div>

      {detail && detail.specializations.length > 0 && (
        <section aria-labelledby="panel-specs" className="flex flex-col gap-1">
          <h3 id="panel-specs" className="font-semibold">
            Specialisations
          </h3>
          <ul className="flex flex-col gap-1">
            {detail.specializations.map(({ specialization, adds }) => (
              <li key={specialization.id} className="flex flex-wrap items-center gap-2">
                <span className={specialization.id === n.id ? "font-medium" : ""}>{specialization.name}</span>
                <span className="text-xs text-muted-foreground">adds {adds.length}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-pressed={selectedSpecs.includes(specialization.id)}
                  onClick={() => onToggleSpec(specialization.id)}
                >
                  {selectedSpecs.includes(specialization.id) ? "Hide requirements" : "Show requirements"}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {GROUPS.map((g) => {
        const items = links.filter((l) => l.kind === g.kind && l.direction === g.direction);
        if (items.length === 0) return null;
        const title = g.title(!isItem);
        return (
          <section key={`${g.kind}-${g.direction}`} aria-label={title} className="flex flex-col gap-1">
            <h3 className="font-semibold">
              {title} <span className="font-normal text-muted-foreground">({items.length})</span>
            </h3>
            <Connections items={items} onFocus={onFocus} />
          </section>
        );
      })}

      {detail && detail.similar.length > 0 && (
        <section aria-labelledby="panel-similar" className="flex flex-col gap-1">
          <h3 id="panel-similar" className="font-semibold">
            Similar roles
          </h3>
          <ul className="flex flex-col">
            {detail.similar.slice(0, 3).map((s) => (
              <li key={s.role.id} className="py-0.5">
                <button
                  type="button"
                  onClick={() => onFocus(s.role.id)}
                  className="rounded-sm underline underline-offset-4 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {s.role.name}
                </button>{" "}
                <span className="text-muted-foreground">
                  {Math.round(s.score * 100)}% in common:{" "}
                  {s.shared
                    .slice(0, 3)
                    .map((x) => x.item.name)
                    .join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {item && item.usedByCount === 0 && <p className="text-muted-foreground">No role requires this yet.</p>}
    </aside>
  );
}
