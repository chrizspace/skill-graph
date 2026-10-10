/**
 * What the graph explorer shows (docs/PLAN.md §6, M8), as plain data: an overview, the neighbourhood of one node, one
 * role with its requirements in rings by weight, and the route between two roles. The explorer draws these with
 * Cytoscape; nothing here knows about the drawing. No framework or database imports.
 */
import {
  isCatalogue,
  isRoleLike,
  node,
  requirementsOf,
  specializationsOf,
  weightRank,
  type EdgeKind,
  type Graph,
  type GraphEdge,
  type GraphNode,
  type NodeType,
  type Weight,
} from "./graph";
import { certificationStatus, type HeldItem } from "./profile";

/** The explorer's filters (all optional): the practice, node types, a catalogue category and requirement weights. */
export interface ViewFilters {
  practiceId?: string | null;
  types?: readonly NodeType[];
  category?: string | null;
  weights?: readonly Weight[];
}

/** An edge as drawn: the graph's own kinds plus "specialization" (a specialisation hangs off its role). */
export interface ViewEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind | "specialization";
  priority: Weight | null;
  strength: number;
  note: string | null;
}

export interface ViewNode {
  node: GraphNode;
  /** hops from the centre (focus and role views), 0 for the centre itself */
  depth: number;
  /** role view only: 0 the role, 1 specialisations and Critical, 2 Important, 3 Nice to have */
  ring: number | null;
  /** the weight of this item for the role in view (role view only) */
  weight: Weight | null;
}

export interface GraphView {
  kind: "overview" | "focus" | "role" | "path";
  centerId: string | null;
  nodes: ViewNode[];
  edges: ViewEdge[];
}

const edgeId = (kind: string, source: string, target: string) => `${kind}:${source}>${target}`;
const toViewEdge = (e: GraphEdge): ViewEdge => ({
  id: edgeId(e.kind, e.sourceId, e.targetId),
  source: e.sourceId,
  target: e.targetId,
  kind: e.kind,
  priority: e.priority,
  strength: e.strength,
  note: e.note,
});

const published = (graph: Graph) => [...graph.nodes.values()].filter((n) => n.status === "published");

/** The practice a role-like node belongs to (a specialisation belongs to its role's). */
function practiceOf(graph: Graph, n: GraphNode) {
  return n.type === "specialization" ? node(graph, n.parentRoleId!).practiceId : n.practiceId;
}

const hasFilters = (f: ViewFilters) =>
  Boolean(f.practiceId || f.category || (f.weights && f.weights.length < 3));

/** Nodes and edges that pass the filters. Catalogue items that no visible role-like node uses are dropped when a filter is on. */
function filtered(graph: Graph, filters: ViewFilters): { nodes: Map<string, GraphNode>; edges: GraphEdge[] } {
  const types = filters.types ? new Set(filters.types) : null;
  const weights = filters.weights ? new Set(filters.weights) : null;
  let nodes = published(graph).filter((n) => !types || types.has(n.type));
  if (filters.practiceId) {
    nodes = nodes.filter((n) => !isRoleLike(n) || practiceOf(graph, n) === filters.practiceId);
  }
  if (filters.category) nodes = nodes.filter((n) => !isCatalogue(n) || n.category === filters.category);
  const ids = new Set(nodes.map((n) => n.id));
  const edges = graph.edges.filter(
    (e) =>
      ids.has(e.sourceId) &&
      ids.has(e.targetId) &&
      (e.kind !== "requires" || !weights || weights.has(e.priority!)),
  );
  if (hasFilters(filters)) {
    // an item is shown only while a visible role or specialisation requires it
    const needed = new Set(edges.filter((e) => e.kind === "requires").map((e) => e.targetId));
    nodes = nodes.filter((n) => !isCatalogue(n) || needed.has(n.id));
  }
  const keep = new Map(nodes.map((n) => [n.id, n]));
  return { nodes: keep, edges: edges.filter((e) => keep.has(e.sourceId) && keep.has(e.targetId)) };
}

/** Everything that passes the filters (for the overview, drawn faint and laid out by force). */
export function overview(graph: Graph, filters: ViewFilters = {}): GraphView {
  const { nodes, edges } = filtered(graph, filters);
  return {
    kind: "overview",
    centerId: null,
    nodes: [...nodes.values()].map((n) => ({ node: n, depth: 0, ring: null, weight: null })),
    edges: edges.map(toViewEdge),
  };
}

/** The node and everything within `hops` links of it (1–3), ignoring link direction. */
export function focusView(
  graph: Graph,
  centerId: string,
  hops: number,
  filters: ViewFilters = {},
): GraphView {
  const { nodes, edges } = filtered(graph, filters);
  const start = node(graph, centerId);
  const center = nodes.get(centerId) ?? start; // the centre always stays, even if a filter would hide it
  const depth = new Map<string, number>([[center.id, 0]]);
  const adjacent = new Map<string, string[]>();
  for (const e of edges) {
    adjacent.set(e.sourceId, [...(adjacent.get(e.sourceId) ?? []), e.targetId]);
    adjacent.set(e.targetId, [...(adjacent.get(e.targetId) ?? []), e.sourceId]);
  }
  let frontier = [center.id];
  for (let d = 1; d <= Math.max(1, Math.min(3, hops)); d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const other of adjacent.get(id) ?? []) {
        if (!depth.has(other)) {
          depth.set(other, d);
          next.push(other);
        }
      }
    }
    frontier = next;
  }
  const inView = (id: string) => depth.has(id);
  return {
    kind: "focus",
    centerId: center.id,
    nodes: [...depth].map(([id, d]) => ({
      node: nodes.get(id) ?? center,
      depth: d,
      ring: null,
      weight: null,
    })),
    edges: edges.filter((e) => inView(e.sourceId) && inView(e.targetId)).map(toViewEdge),
  };
}

const ringOf = (w: Weight) => weightRank(w) + 1;

/**
 * One role with its core requirements in rings (Critical inner, Important, Nice to have outer) and its specialisations
 * beside it. Specialisations named in `selected` also bring their own requirements; where both name an item the
 * specialisation's weight applies, as in `requirementsOf`.
 */
export function roleView(graph: Graph, roleId: string, selected: readonly string[] = []): GraphView {
  const role = node(graph, roleId);
  const specs = specializationsOf(graph, roleId);
  const chosen = specs.filter((s) => selected.includes(s.id));
  const nodes = new Map<string, ViewNode>([[role.id, { node: role, depth: 0, ring: 0, weight: null }]]);
  const edges: ViewEdge[] = [];
  for (const s of specs) {
    nodes.set(s.id, { node: s, depth: 1, ring: 1, weight: null });
    edges.push({
      id: edgeId("specialization", s.id, role.id),
      source: s.id,
      target: role.id,
      kind: "specialization",
      priority: null,
      strength: 3,
      note: null,
    });
  }
  const addRequirements = (ownerId: string, effective: ReturnType<typeof requirementsOf>) => {
    for (const r of effective) {
      nodes.set(r.item.id, { node: r.item, depth: 1, ring: ringOf(r.weight), weight: r.weight });
    }
    for (const e of graph.edges.filter((x) => x.kind === "requires" && x.sourceId === ownerId)) {
      if (nodes.has(e.targetId)) edges.push(toViewEdge(e));
    }
  };
  addRequirements(role.id, requirementsOf(graph, { roleId }));
  for (const s of chosen) {
    // effective weights for role + this specialisation
    addRequirements(s.id, requirementsOf(graph, { roleId, specializationId: s.id }));
  }
  // if a specialisation raised or lowered a core weight, the edge from the role keeps its own weight but the node shows the effective one
  return { kind: "role", centerId: role.id, nodes: [...nodes.values()], edges: dedupe(edges) };
}

const dedupe = (edges: ViewEdge[]) => [...new Map(edges.map((e) => [e.id, e])).values()];

export interface RouteResult {
  /** "official": along defined career paths; "shortest": the fewest links, over skills the roles share */
  how: "official" | "shortest";
  view: GraphView;
  /** the nodes of the route in order */
  route: GraphNode[];
}

/** A role with its own specialisations: a path can start or end at any of them. */
const withSpecializations = (graph: Graph, n: GraphNode) =>
  n.type === "role" ? [n, ...specializationsOf(graph, n.id)] : [n];

/**
 * The route from one role (or specialisation) to another. The official path (following `next_step` links, any number
 * of moves) is preferred; if there is none, the shortest route over any links. Null when the two aren't connected.
 */
export function routeBetween(graph: Graph, fromId: string, toId: string): RouteResult | null {
  const from = node(graph, fromId);
  const to = node(graph, toId);
  const found =
    search(
      graph,
      withSpecializations(graph, from),
      new Set(withSpecializations(graph, to).map((n) => n.id)),
      true,
    ) ?? search(graph, [from], new Set([to.id]), false);
  if (!found) return null;
  const official = found.official;
  const ids = new Set(found.path.map((n) => n.id));
  const nodes: ViewNode[] = found.path.map((n, i) => ({ node: n, depth: i, ring: null, weight: null }));
  return {
    how: official ? "official" : "shortest",
    route: found.path,
    view: {
      kind: "path",
      centerId: found.path[0].id,
      nodes,
      edges: found.edges.map(toViewEdge).filter((e) => ids.has(e.source) && ids.has(e.target)),
    },
  };
}

function search(graph: Graph, starts: GraphNode[], goals: Set<string>, officialOnly: boolean) {
  const prev = new Map<string, { from: string; edge: GraphEdge } | null>(starts.map((s) => [s.id, null]));
  let frontier = starts.map((s) => s.id);
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) {
      if (goals.has(id)) return rebuild(graph, prev, id, officialOnly);
      const links = officialOnly
        ? (graph.out.get(id) ?? [])
            .filter((e) => e.kind === "next_step")
            .map((e) => ({ e, other: e.targetId }))
        : [
            ...(graph.out.get(id) ?? []).map((e) => ({ e, other: e.targetId })),
            ...(graph.in.get(id) ?? []).map((e) => ({ e, other: e.sourceId })),
          ];
      for (const { e, other } of links) {
        if (prev.has(other) || graph.nodes.get(other)?.status !== "published") continue;
        prev.set(other, { from: id, edge: e });
        next.push(other);
      }
    }
    frontier = next;
  }
  return null;
}

function rebuild(
  graph: Graph,
  prev: Map<string, { from: string; edge: GraphEdge } | null>,
  end: string,
  official: boolean,
) {
  const path: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  for (let id: string | undefined = end; id;) {
    path.unshift(node(graph, id));
    const p: { from: string; edge: GraphEdge } | null | undefined = prev.get(id);
    if (!p) break;
    edges.unshift(p.edge);
    id = p.from;
  }
  return { path, edges, official };
}

export interface Neighbour {
  node: GraphNode;
  kind: EdgeKind;
  /** "out": this node's link points to it; "in": it points here */
  direction: "out" | "in";
  weight: Weight | null;
  strength: number;
}

/** The nodes linked to this one, grouped by how (for the side panel and for walking the graph by keyboard). */
export function neighbours(graph: Graph, id: string): Neighbour[] {
  const out: Neighbour[] = (graph.out.get(id) ?? []).map((e) => ({
    node: node(graph, e.targetId),
    kind: e.kind,
    direction: "out" as const,
    weight: e.priority,
    strength: e.strength,
  }));
  const into: Neighbour[] = (graph.in.get(id) ?? []).map((e) => ({
    node: node(graph, e.sourceId),
    kind: e.kind,
    direction: "in" as const,
    weight: e.priority,
    strength: e.strength,
  }));
  const kinds: EdgeKind[] = ["requires", "builds_on", "next_step", "related_to"];
  return [...out, ...into]
    .filter((n) => n.node.status === "published")
    .sort(
      (a, b) =>
        kinds.indexOf(a.kind) - kinds.indexOf(b.kind) ||
        (a.direction === b.direction ? 0 : a.direction === "out" ? -1 : 1) ||
        (a.weight && b.weight ? weightRank(a.weight) - weightRank(b.weight) : 0) ||
        a.node.name.localeCompare(b.node.name),
    );
}

/** The weight a catalogue item has for the role (and specialisation) in focus, or null if it isn't required. */
export function weightFor(graph: Graph, roleLikeId: string, itemId: string): Weight | null {
  const target = node(graph, roleLikeId);
  const reqs =
    target.type === "specialization"
      ? requirementsOf(graph, { roleId: target.parentRoleId!, specializationId: target.id })
      : target.type === "role"
        ? requirementsOf(graph, { roleId: target.id })
        : [];
  return reqs.find((r) => r.item.id === itemId)?.weight ?? null;
}

export type MyState = "met" | "expiring" | "expired" | "missing";

/**
 * How a person stands with a catalogue item in "my view": held (a certification also valid, expiring or expired) or
 * missing. An expired certification still counts as held. Null for roles and specialisations.
 */
export function myState(
  item: GraphNode,
  held: ReadonlyMap<string, HeldItem>,
  today: Date | string,
): MyState | null {
  if (!isCatalogue(item)) return null;
  const h = held.get(item.id);
  if (!h) return "missing";
  if (item.type !== "certification") return "met";
  const status = certificationStatus(h, today);
  return status === "valid" ? "met" : status;
}

/** Nodes of a view found by a search, for the explorer's search box: published roles, specialisations and items. */
export function searchNodes(graph: Graph, query: string, limit = 12): GraphNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = published(graph)
    .map((n) => {
      const name = (
        n.type === "specialization" ? `${node(graph, n.parentRoleId!).name}: ${n.name}` : n.name
      ).toLowerCase();
      const at = name.indexOf(q);
      return { n, at, rank: at === 0 ? 0 : at > 0 ? 1 : 2 };
    })
    .filter((s) => s.at >= 0)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        (isRoleLike(b.n) ? 1 : 0) - (isRoleLike(a.n) ? 1 : 0) ||
        a.n.name.localeCompare(b.n.name),
    );
  return scored.slice(0, limit).map((s) => s.n);
}
