/**
 * How the explorer draws a GraphView with Cytoscape (docs/PLAN.md §6): shapes by type, line width by strength,
 * priority colour only in context, and never colour alone (labels carry the weight and the state, lines are
 * solid / dashed / dotted). Pure: elements, layouts and a stylesheet built from design tokens; the canvas component
 * hands them to Cytoscape.
 */
import type cytoscape from "cytoscape";
import { weightFor, type GraphView, type MyState } from "@/domain/explore";
import { isCatalogue, type Graph, type Weight } from "@/domain/graph";

export const WEIGHT_LABEL: Record<Weight, string> = {
  critical: "Critical",
  important: "Important",
  nice: "Nice to have",
};

/** What is drawn for a node's kind: the shape names are Cytoscape's. */
export const SHAPES = {
  role: "hexagon",
  specialization: "hexagon",
  technical_skill: "ellipse",
  soft_skill: "diamond",
  certification: "star",
} as const;

export const TYPE_LABEL = {
  role: "Role",
  specialization: "Specialisation",
  technical_skill: "Technical skill",
  soft_skill: "Soft skill",
  certification: "Certification",
} as const;

/** Tools and platforms are technical skills with this category; they get a darker outline. */
export const TOOL_CATEGORY = "Tool / platform";

export interface DrawOptions {
  /** how the person stands with each catalogue item ("my view"); empty or absent when it is off */
  states?: ReadonlyMap<string, MyState>;
  /** a route: node id to its step number (1, 2, …), written into the label so the order isn't only a highlight */
  route?: ReadonlyMap<string, number>;
}

const stateMark: Record<MyState, { prefix: string; suffix: string }> = {
  met: { prefix: "✓ ", suffix: "" },
  expiring: { prefix: "✓ ", suffix: " (expiring)" },
  expired: { prefix: "✓ ", suffix: " (expired)" },
  missing: { prefix: "○ ", suffix: "" },
};

/** Whether this view colours requirements by weight: only with a role (or specialisation) in focus. */
const weightsInContext = (graph: Graph, view: GraphView) => {
  if (view.kind === "role") return true;
  if (view.kind !== "focus" || !view.centerId) return false;
  const t = graph.nodes.get(view.centerId)?.type;
  return t === "role" || t === "specialization";
};

/** Cytoscape elements for a view. Labels spell out weights and states, so colour is never the only signal. */
export function toElements(
  graph: Graph,
  view: GraphView,
  options: DrawOptions = {},
): cytoscape.ElementDefinition[] {
  const context = weightsInContext(graph, view);
  const centerId = view.centerId;
  const elements: cytoscape.ElementDefinition[] = [];
  for (const vn of view.nodes) {
    const n = vn.node;
    const weight: Weight | null =
      vn.weight ?? (context && centerId && isCatalogue(n) ? weightFor(graph, centerId, n.id) : null);
    const state = options.states?.get(n.id) ?? null;
    const mark = state ? stateMark[state] : null;
    const step = options.route?.get(n.id);
    const label = `${step ? `${step}. ` : ""}${mark?.prefix ?? ""}${n.name}${mark?.suffix ?? ""}${weight && context ? ` · ${WEIGHT_LABEL[weight]}` : ""}`;
    const classes = [
      n.type,
      n.category === TOOL_CATEGORY ? "tool" : "",
      state ?? "",
      n.id === centerId ? "center" : "",
    ].filter(Boolean);
    // concentric rings: the role in the middle, its specialisations next to it, then Critical, Important, Nice to have
    const ring =
      n.type === "specialization"
        ? 1
        : vn.weight
          ? 2 + ["critical", "important", "nice"].indexOf(vn.weight)
          : 0;
    elements.push({
      group: "nodes",
      data: { id: n.id, label, type: n.type, weight, state, depth: vn.depth, ring },
      classes: classes.join(" "),
    });
  }
  for (const e of view.edges) {
    // only requirements of the role in focus are coloured; the rest of the graph stays neutral
    const coloured =
      context && e.kind === "requires" && e.priority && (e.source === centerId || view.kind === "role");
    elements.push({
      group: "edges",
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        kind: e.kind,
        strength: e.strength,
        weight: coloured ? e.priority : null,
      },
      classes: [e.kind, coloured ? `w-${e.priority}` : ""].filter(Boolean).join(" "),
    });
  }
  return elements;
}

/** The layout for a view: force-directed overview, rings for a role, rings by hops for a neighbourhood. */
export function layoutFor(view: GraphView): cytoscape.LayoutOptions {
  switch (view.kind) {
    case "overview": {
      // fcose gets slower with size: small graphs get the careful layout, bigger ones a rougher, much faster pass
      const big = view.nodes.length > 250;
      return {
        name: "fcose",
        animate: false,
        quality: big ? "draft" : "default",
        randomize: true,
        nodeRepulsion: () => 9000,
        idealEdgeLength: () => 70,
        piTol: big ? 0.001 : 0.0000001,
        padding: 24,
      } as cytoscape.LayoutOptions;
    }
    case "role":
      return {
        name: "concentric",
        animate: false,
        concentric: (n: cytoscape.NodeSingular) => 10 - Number(n.data("ring")),
        levelWidth: () => 1,
        minNodeSpacing: 36,
        padding: 24,
      } as cytoscape.LayoutOptions;
    case "focus":
      return {
        name: "concentric",
        animate: false,
        concentric: (n: cytoscape.NodeSingular) => 10 - Number(n.data("depth")),
        levelWidth: () => 1,
        minNodeSpacing: 30,
        padding: 24,
      } as cytoscape.LayoutOptions;
    case "path":
      return { name: "breadthfirst", animate: false, directed: true, spacingFactor: 1.2, padding: 24 };
  }
}

/**
 * A force layout gets slow with the number of links. Above this many, only the strongest links steer the layout; all of
 * them are still drawn. (docs/PLAN.md §6: the overview of a 2k-node, 20k-link graph must be interactive in under 2 s.)
 */
export const LAYOUT_EDGE_BUDGET = 3000;

/** The links that steer the layout: all of them, or the strongest `LAYOUT_EDGE_BUDGET` for a big graph. */
export function layoutEdges<T extends { strength: number }>(edges: readonly T[]): T[] {
  if (edges.length <= LAYOUT_EDGE_BUDGET) return [...edges];
  return [...edges].sort((a, b) => b.strength - a.strength).slice(0, LAYOUT_EDGE_BUDGET);
}

/** The design tokens the drawing uses, as colours read from the page (they follow the theme). */
export const COLOR_TOKENS = [
  "background",
  "foreground",
  "muted-foreground",
  "border",
  "ring",
  "critical",
  "important",
  "nice",
  "node-role",
  "node-specialization",
  "node-technical",
  "node-soft",
  "node-certification",
] as const;
export type Colors = Record<(typeof COLOR_TOKENS)[number], string>;

/** Reads the tokens from an element's computed style, with a plain fallback so a missing value never breaks drawing. */
export function readColors(el: Element): Colors {
  const css = getComputedStyle(el);
  const get = (name: string, fallback: string) => css.getPropertyValue(`--${name}`).trim() || fallback;
  return Object.fromEntries(COLOR_TOKENS.map((t) => [t, get(t, "#777777")])) as Colors;
}

/** The Cytoscape stylesheet for the tokens' colours. Line width runs 1–6 px with strength 1–5. */
export function stylesheet(c: Colors, big = false): cytoscape.StylesheetJson {
  const type = (cls: string, shape: string, color: string, size: number): cytoscape.StylesheetJsonBlock => ({
    selector: `node.${cls}`,
    style: {
      shape: shape as cytoscape.Css.Node["shape"],
      "background-color": color,
      width: size,
      height: size,
    },
  });
  return [
    {
      selector: "node",
      style: {
        label: "data(label)",
        color: c.foreground,
        "font-size": 11,
        "text-wrap": "wrap",
        "text-max-width": "110px",
        "text-valign": "bottom",
        "text-margin-y": 4,
        "text-background-color": c.background,
        "text-background-opacity": 0.85,
        "text-background-padding": "2px",
        "min-zoomed-font-size": 9,
        "border-width": 1,
        "border-color": c.foreground,
        "overlay-opacity": 0,
      },
    },
    type("role", SHAPES.role, c["node-role"], 38),
    type("specialization", SHAPES.specialization, c["node-specialization"], 26),
    type("technical_skill", SHAPES.technical_skill, c["node-technical"], 20),
    type("soft_skill", SHAPES.soft_skill, c["node-soft"], 22),
    type("certification", SHAPES.certification, c["node-certification"], 26),
    { selector: "node.tool", style: { "border-width": 3 } },
    { selector: "node.center", style: { "border-width": 4, "font-weight": "bold", "font-size": 13 } },
    // my view: a missing item is hollow and dashed, an expired certification is faded; labels carry ✓ / ○ as well
    {
      selector: "node.missing",
      style: { "background-color": c.background, "border-style": "dashed", "border-width": 2 },
    },
    { selector: "node.expired", style: { opacity: 0.45 } },
    { selector: "node:selected", style: { "border-color": c.ring, "border-width": 5 } },
    // a route: everything else steps back, the route keeps full strength and a heavier line
    { selector: ".dimmed", style: { opacity: 0.12 } },
    {
      selector: "node.route",
      style: { "border-width": 4, "font-weight": "bold", "font-size": 13, "min-zoomed-font-size": 0 },
    },
    {
      selector: "edge.route",
      style: {
        width: 6,
        opacity: 1,
        "line-color": c.foreground,
        "target-arrow-color": c.foreground,
      },
    },
    {
      selector: "edge",
      style: {
        width: "mapData(strength, 1, 5, 1, 6)",
        "line-color": c.border,
        "target-arrow-color": c.border,
        // a big graph draws plain straight lines (several times faster than curves); arrows keep their curve
        "curve-style": big ? "haystack" : "bezier",
        ...(big ? { "haystack-radius": 0 } : {}),
        opacity: 0.55,
      },
    },
    {
      selector: "edge.next_step",
      style: {
        "curve-style": "bezier",
        "target-arrow-shape": "triangle",
        "arrow-scale": 1.2,
        opacity: 0.9,
        "line-color": c["muted-foreground"],
        "target-arrow-color": c["muted-foreground"],
      },
    },
    {
      selector: "edge.builds_on",
      style: { "curve-style": "bezier", "target-arrow-shape": "vee", "line-style": "solid" },
    },
    { selector: "edge.related_to", style: { "line-style": "dashed" } },
    // priority: colour, and always a line style too (solid, dashed, dotted)
    { selector: "edge.w-critical", style: { "line-color": c.critical, "line-style": "solid", opacity: 1 } },
    {
      selector: "edge.w-important",
      style: { "line-color": c.important, "line-style": "dashed", opacity: 1 },
    },
    { selector: "edge.w-nice", style: { "line-color": c.nice, "line-style": "dotted", opacity: 1 } },
  ];
}
