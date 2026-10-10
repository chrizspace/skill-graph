import { describe, expect, it } from "vitest";
import { focusView, neighbours, overview, roleView, routeBetween, searchNodes } from "../explore";
import { buildGraph } from "../graph";
import { syntheticGraph } from "./synthetic-graph";

const { nodes, edges } = syntheticGraph();

describe("syntheticGraph", () => {
  it("has 2,000 nodes and 20,000 links of the four kinds", () => {
    expect(nodes).toHaveLength(2000);
    expect(edges).toHaveLength(20000);
    const kinds = new Set(edges.map((e) => e.kind));
    expect([...kinds].sort()).toEqual(["builds_on", "next_step", "related_to", "requires"]);
    const types = new Set(nodes.map((n) => n.type));
    expect(types.size).toBe(5);
  });
  it("has unique ids and links, no self-loops, and only links between nodes it has", () => {
    const ids = new Set(nodes.map((n) => n.id));
    expect(ids.size).toBe(nodes.length);
    expect(new Set(edges.map((e) => `${e.kind}|${e.sourceId}|${e.targetId}`)).size).toBe(edges.length);
    expect(edges.every((e) => e.sourceId !== e.targetId && ids.has(e.sourceId) && ids.has(e.targetId))).toBe(
      true,
    );
    // requirements carry a weight, nothing else does; related pairs are ordered
    expect(edges.every((e) => (e.kind === "requires") === (e.priority !== null))).toBe(true);
    expect(edges.filter((e) => e.kind === "related_to").every((e) => e.sourceId < e.targetId)).toBe(true);
  });
  it("is deterministic, and a seed changes it", () => {
    expect(syntheticGraph().edges.slice(0, 50)).toEqual(edges.slice(0, 50));
    expect(syntheticGraph({ seed: 2 }).edges.slice(0, 50)).not.toEqual(edges.slice(0, 50));
  });
  it("can be made smaller", () => {
    const small = syntheticGraph({ nodes: 200, links: 1000 });
    expect(small.nodes).toHaveLength(200);
    expect(small.edges).toHaveLength(1000);
  });
});

// The domain work behind the explorer must stay fast at this size (generous limits: this is about order of magnitude,
// not a benchmark; the browser's drawing time is measured in e2e/explore-performance.spec.ts).
describe("explorer logic on 2,000 nodes and 20,000 links", () => {
  const time = <T>(fn: () => T) => {
    const t = performance.now();
    const result = fn();
    return { result, ms: performance.now() - t };
  };
  const built = time(() => buildGraph(nodes, edges));
  const graph = built.result;

  it("builds the in-memory graph quickly", () => expect(built.ms).toBeLessThan(1000));
  it("makes the overview, with every filter", () => {
    const all = time(() => overview(graph));
    expect(all.result.nodes).toHaveLength(2000);
    expect(all.ms).toBeLessThan(1000);
    const filtered = time(() => overview(graph, { practiceId: "practice-3", weights: ["critical"] }));
    expect(filtered.result.nodes.length).toBeLessThan(2000);
    expect(filtered.ms).toBeLessThan(1000);
  });
  it("focuses on a role, a hub skill and 3 hops out", () => {
    expect(time(() => roleView(graph, "role-5", ["spec-2"])).ms).toBeLessThan(500);
    const hub = time(() => focusView(graph, "item-0", 3));
    expect(hub.result.nodes.length).toBeGreaterThan(100);
    expect(hub.ms).toBeLessThan(1000);
  });
  it("finds routes, neighbours and search results", () => {
    expect(time(() => routeBetween(graph, "role-1", "role-150")).ms).toBeLessThan(1000);
    expect(time(() => neighbours(graph, "item-0")).ms).toBeLessThan(200);
    const found = time(() => searchNodes(graph, "skill 12"));
    expect(found.result.length).toBeGreaterThan(0);
    expect(found.ms).toBeLessThan(300);
  });
});
