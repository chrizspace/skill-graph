"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { GraphCanvas } from "@/components/graph/graph-canvas";
import { GraphLegend } from "@/components/graph/graph-legend";
import { GraphPanel } from "@/components/graph/graph-panel";
import { GraphTable, type TableRow } from "@/components/graph/graph-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { catalogueCategories } from "@/domain/browse";
import {
  focusView,
  myState,
  neighbours,
  overview,
  roleView,
  searchNodes,
  weightFor,
  type GraphView,
  type MyState,
  type ViewFilters,
} from "@/domain/explore";
import {
  buildGraph,
  roles,
  specializationsOf,
  weights,
  type GraphEdge,
  type GraphNode,
  type NodeType,
  type Weight,
} from "@/domain/graph";
import type { HeldItem } from "@/domain/profile";
import { WEIGHT_LABEL, TYPE_LABEL, layoutFor, toElements } from "@/lib/graph-style";

export interface ExplorerInitial {
  focus: string | null;
  hops: number;
  practice: string | null;
  types: NodeType[];
  category: string | null;
  weights: Weight[];
}

const ALL_TYPES = Object.keys(TYPE_LABEL) as NodeType[];

const subscribeWide = (notify: () => void) => {
  const query = matchMedia("(min-width: 768px)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const isWide = () => matchMedia("(min-width: 768px)").matches;

/**
 * The graph explorer (docs/PLAN.md §6). It opens on a search box and a role picker, never on the whole hairball:
 * the overview is faint, a role opens as rings by weight, anything else as its neighbourhood. Everything drawn is also
 * in the table view, and the whole thing works by keyboard: `/` searches, up and down choose a neighbour, right or
 * Enter goes there, left goes back, Escape clears.
 */
export function Explorer({
  nodes,
  edges,
  practices,
  held,
  today,
  initial,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  practices: { id: string; slug: string; name: string }[];
  held: (HeldItem & { obtainedOn: string | null; expiresOn: string | null })[] | null;
  today: string;
  initial: ExplorerInitial;
}) {
  const graph = useMemo(() => buildGraph(nodes, edges), [nodes, edges]);
  const startFocus = initial.focus
    ? ([...graph.nodes.values()].find((n) => n.slug === initial.focus && n.status === "published")?.id ??
      null)
    : null;

  const [focusId, setFocusId] = useState<string | null>(startFocus);
  const [selectedId, setSelectedId] = useState<string | null>(startFocus);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [hops, setHops] = useState(initial.hops);
  const [rings, setRings] = useState(true);
  const [practiceId, setPracticeId] = useState<string | null>(
    practices.find((p) => p.slug === initial.practice)?.id ?? null,
  );
  const [types, setTypes] = useState<NodeType[]>(initial.types.length ? initial.types : ALL_TYPES);
  const [category, setCategory] = useState<string | null>(initial.category);
  const [weightFilter, setWeightFilter] = useState<Weight[]>(
    initial.weights.length ? initial.weights : [...weights],
  );
  const [myView, setMyView] = useState(held !== null);
  const [tabChoice, setTabChoice] = useState<"graph" | "table" | null>(null);
  const [query, setQuery] = useState("");
  const [candidate, setCandidate] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const wide = useSyncExternalStore(subscribeWide, isWide, () => true);
  const tab = tabChoice ?? (wide ? "graph" : "table"); // small screens open on the table; the graph is opt-in

  const filters: ViewFilters = useMemo(
    () => ({
      practiceId,
      category,
      types: types.length === ALL_TYPES.length ? undefined : types,
      weights: weightFilter.length === 3 ? undefined : weightFilter,
    }),
    [practiceId, category, types, weightFilter],
  );

  const focusNode = focusId ? graph.nodes.get(focusId) : undefined;
  const view: GraphView = useMemo(() => {
    if (!focusNode) return overview(graph, filters);
    if (rings && (focusNode.type === "role" || focusNode.type === "specialization")) {
      const roleId = focusNode.type === "role" ? focusNode.id : focusNode.parentRoleId!;
      const specs = focusNode.type === "specialization" ? [focusNode.id, ...selectedSpecs] : selectedSpecs;
      return roleView(graph, roleId, specs);
    }
    return focusView(graph, focusNode.id, hops, filters);
  }, [graph, filters, focusNode, rings, hops, selectedSpecs]);

  const heldMap = useMemo(() => new Map((held ?? []).map((h) => [h.nodeId, h])), [held]);
  const states = useMemo(() => {
    if (!myView || held === null) return undefined;
    const map = new Map<string, MyState>();
    for (const vn of view.nodes) {
      const s = myState(vn.node, heldMap, today);
      if (s) map.set(vn.node.id, s);
    }
    return map;
  }, [myView, held, view, heldMap, today]);

  const elements = useMemo(() => toElements(graph, view, { states }), [graph, view, states]);
  const layout = useMemo(() => layoutFor(view), [view]);
  const categories = useMemo(() => catalogueCategories(graph), [graph]);
  const results = useMemo(() => searchNodes(graph, query), [graph, query]);
  const inView = useMemo(() => new Set(view.nodes.map((n) => n.node.id)), [view]);
  const walk = useMemo(
    () => (selectedId ? neighbours(graph, selectedId).filter((n) => inView.has(n.node.id)) : []),
    [graph, selectedId, inView],
  );

  const select = (id: string | null) => {
    if (id && selectedId && id !== selectedId) setHistory((h) => [...h.slice(-30), selectedId]);
    setSelectedId(id);
    setCandidate(0);
  };
  const focus = (id: string | null) => {
    setFocusId(id);
    setSelectedSpecs([]);
    setRings(true);
    setQuery("");
    select(id);
  };
  const toggleSpec = (id: string) =>
    setSelectedSpecs((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // keep the address in step with the view, so it can be shared
  useEffect(() => {
    const p = new URLSearchParams();
    if (focusNode) p.set("focus", focusNode.slug);
    if (focusNode && !rings) p.set("hops", String(hops));
    const practice = practices.find((x) => x.id === practiceId);
    if (practice) p.set("practice", practice.slug);
    if (types.length !== ALL_TYPES.length) p.set("type", types.join(","));
    if (category) p.set("category", category);
    if (weightFilter.length !== 3) p.set("w", weightFilter.join(","));
    const qs = p.toString();
    history_replace(qs ? `?${qs}` : location.pathname);
  }, [focusNode, rings, hops, practiceId, types, category, weightFilter, practices]);

  // `/` jumps to the search box from anywhere on the page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !/^(input|textarea|select)$/i.test(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onGraphKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (focusId) focus(null);
      else select(null);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (walk.length === 0) return;
      e.preventDefault();
      setCandidate((c) => (c + (e.key === "ArrowDown" ? 1 : -1) + walk.length) % walk.length);
    } else if ((e.key === "ArrowRight" || e.key === "Enter") && walk[candidate]) {
      e.preventDefault();
      select(walk[candidate].node.id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const back = history[history.length - 1];
      if (back) {
        setHistory((h) => h.slice(0, -1));
        setSelectedId(back);
        setCandidate(0);
      }
    }
  };

  const rows: TableRow[] = view.nodes.map((vn) => ({
    id: vn.node.id,
    name:
      vn.node.type === "specialization"
        ? `${graph.nodes.get(vn.node.parentRoleId!)!.name}: ${vn.node.name}`
        : vn.node.name,
    type: TYPE_LABEL[vn.node.type],
    weight:
      vn.weight ??
      (view.centerId && vn.node.id !== view.centerId ? weightFor(graph, view.centerId, vn.node.id) : null),
    state: states?.get(vn.node.id) ?? null,
    links: neighbours(graph, vn.node.id).length,
  }));
  const selected = selectedId ? graph.nodes.get(selectedId) : undefined;
  const announcement = [
    selected
      ? `Selected ${selected.name}, ${TYPE_LABEL[selected.type]}, ${neighbours(graph, selected.id).length} connections.`
      : "",
    walk[candidate]
      ? `Next neighbour: ${walk[candidate].node.name}. Press right arrow or Enter to go there.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  const caption = focusNode
    ? `${focusNode.name} and ${view.nodes.length - 1} connected items`
    : `${view.nodes.length} roles, skills and certifications`;
  const description = `${view.nodes.length} nodes and ${view.edges.length} links${focusNode ? `, focused on ${focusNode.name}` : ""}`;

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Graph</h1>
        <p className="mt-1 text-muted-foreground">
          Roles, what they require and where they lead. Search or pick a role to start; the overview stays
          faint on purpose.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-72 max-w-full">
          <Label htmlFor="graph-search" className="mb-1.5">
            Search <span className="text-xs text-muted-foreground">(press / )</span>
          </Label>
          <Input
            id="graph-search"
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) focus(results[0].id);
              if (e.key === "Escape") setQuery("");
            }}
            placeholder="A role, skill or certification"
            autoComplete="off"
          />
          {results.length > 0 && (
            <ul
              aria-label="Search results"
              className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md"
            >
              {results.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => focus(n.id)}
                    className="flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span>
                      {n.type === "specialization"
                        ? `${graph.nodes.get(n.parentRoleId!)!.name}: ${n.name}`
                        : n.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{TYPE_LABEL[n.type]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="grid w-64 max-w-full gap-1.5">
          <Label htmlFor="graph-role">Pick a role</Label>
          <NativeSelect
            id="graph-role"
            value={
              focusNode && (focusNode.type === "role" || focusNode.type === "specialization")
                ? focusNode.id
                : ""
            }
            onChange={(e) => focus(e.target.value || null)}
          >
            <option value="">Overview</option>
            {roles(graph).flatMap((r) => [
              <option key={r.id} value={r.id}>
                {r.name}
              </option>,
              ...specializationsOf(graph, r.id).map((s) => (
                <option key={s.id} value={s.id}>
                  {r.name}: {s.name}
                </option>
              )),
            ])}
          </NativeSelect>
        </div>
        {focusId && (
          <Button type="button" variant="outline" onClick={() => focus(null)}>
            Back to the overview
          </Button>
        )}
        {held !== null && (
          <label className="flex items-center gap-2 pb-1.5 text-sm">
            <input
              type="checkbox"
              checked={myView}
              onChange={(e) => setMyView(e.target.checked)}
              className="size-4 accent-primary"
            />
            My view (✓ have, ○ missing)
          </label>
        )}
      </div>

      <details className="rounded-lg border p-3" open={!focusId}>
        <summary className="cursor-pointer text-sm font-semibold">Filters</summary>
        <div className="mt-3 grid content-start items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5">
            <Label htmlFor="f-practice">Practice</Label>
            <NativeSelect
              id="f-practice"
              value={practiceId ?? ""}
              onChange={(e) => setPracticeId(e.target.value || null)}
            >
              <option value="">All practices</option>
              {practices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="f-category">Category</Label>
            <NativeSelect
              id="f-category"
              value={category ?? ""}
              onChange={(e) => setCategory(e.target.value || null)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
          </div>
          <fieldset className="grid gap-1">
            <legend className="mb-1 text-sm font-medium">Type</legend>
            {ALL_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={types.includes(t)}
                  onChange={() => setTypes((x) => (toggle(x, t).length ? toggle(x, t) : x))}
                  className="size-4 accent-primary"
                />
                {TYPE_LABEL[t]}
              </label>
            ))}
          </fieldset>
          <div className="grid content-start gap-4">
            <fieldset className="grid gap-1">
              <legend className="mb-1 text-sm font-medium">Weight</legend>
              {weights.map((w) => (
                <label key={w} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={weightFilter.includes(w)}
                    onChange={() => setWeightFilter((x) => (toggle(x, w).length ? toggle(x, w) : x))}
                    className="size-4 accent-primary"
                  />
                  {WEIGHT_LABEL[w]}
                </label>
              ))}
            </fieldset>
            {focusNode && (
              <div className="grid gap-1.5">
                <Label htmlFor="f-hops">Hops from the focus</Label>
                <NativeSelect id="f-hops" value={hops} onChange={(e) => setHops(Number(e.target.value))}>
                  {[1, 2, 3].map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}
          </div>
        </div>
        {focusNode && (focusNode.type === "role" || focusNode.type === "specialization") && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="font-medium">Role layout</span>
            <Button
              type="button"
              size="sm"
              variant={rings ? "default" : "outline"}
              aria-pressed={rings}
              onClick={() => setRings(true)}
            >
              Rings by weight
            </Button>
            <Button
              type="button"
              size="sm"
              variant={rings ? "outline" : "default"}
              aria-pressed={!rings}
              onClick={() => setRings(false)}
            >
              Neighbourhood
            </Button>
          </div>
        )}
      </details>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Tabs value={tab} onValueChange={(v) => setTabChoice(v as "graph" | "table")} className="min-w-0">
          <TabsList>
            <TabsTrigger value="graph">Graph</TabsTrigger>
            <TabsTrigger value="table">Table view</TabsTrigger>
          </TabsList>
          <TabsContent value="graph">
            <div
              tabIndex={0}
              role="group"
              aria-label={`Graph: ${description}. Use the arrow keys to choose a neighbour and Enter to go there; Escape clears.`}
              onKeyDown={onGraphKey}
              className="h-[65vh] rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <GraphCanvas
                elements={elements}
                layout={layout}
                selectedId={selectedId}
                onSelect={select}
                onOpen={focus}
                label={`Skill graph: ${description}`}
                className="h-full"
              />
            </div>
          </TabsContent>
          <TabsContent value="table">
            <GraphTable rows={rows} caption={caption} showState={Boolean(states)} onFocus={focus} />
          </TabsContent>
        </Tabs>
        <div className="flex flex-col gap-4">
          <GraphPanel
            graph={graph}
            selectedId={selectedId}
            focusId={focusId}
            states={states}
            selectedSpecs={selectedSpecs}
            onFocus={focus}
            onToggleSpec={toggleSpec}
          />
          <GraphLegend showWeights showMyView={Boolean(states)} />
        </div>
      </div>
    </div>
  );
}

// the address bar is kept in step without navigating (no new history entry, no re-render of the page)
function history_replace(url: string) {
  window.history.replaceState(null, "", url);
}
