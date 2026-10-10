import { describe, expect, it } from "vitest";
import {
  focusView,
  myState,
  neighbours,
  overview,
  roleView,
  routeBetween,
  searchNodes,
  weightFor,
} from "./explore";
import type { HeldItem } from "./profile";
import { seedGraph } from "./testing/seed-graph";

const graph = seedGraph();
const names = (v: { nodes: { node: { name: string } }[] }) => v.nodes.map((n) => n.node.name).sort();
const TODAY = "2026-10-10";

describe("overview", () => {
  it("shows every published node and the links between them", () => {
    const v = overview(graph);
    expect(v.kind).toBe("overview");
    expect(v.nodes).toHaveLength(graph.nodes.size);
    expect(v.edges).toHaveLength(graph.edges.length);
  });
  it("filters by practice: its roles, their specialisations and what they require", () => {
    const v = overview(graph, { practiceId: "data-ai" });
    const roles = v.nodes.filter((n) => n.node.type === "role").map((n) => n.node.name);
    expect(roles.sort()).toEqual([
      "AI Engineer",
      "Analytics Engineer",
      "Data Analyst",
      "Data Engineer",
      "Data Scientist",
    ]);
    expect(names(v)).toContain("Databricks");
    expect(names(v)).not.toContain("Scrum Master");
    // no item is shown that no visible role requires
    const needed = new Set(v.edges.filter((e) => e.kind === "requires").map((e) => e.target));
    for (const n of v.nodes.filter((n) => n.node.type === "technical_skill"))
      expect(needed.has(n.node.id)).toBe(true);
  });
  it("filters by type and by category", () => {
    const certs = overview(graph, { types: ["role", "certification"] });
    expect(certs.nodes.every((n) => ["role", "certification"].includes(n.node.type))).toBe(true);
    const tools = overview(graph, { category: "Tool / platform" });
    expect(
      tools.nodes
        .filter((n) => n.node.type === "technical_skill")
        .every((n) => n.node.category === "Tool / platform"),
    ).toBe(true);
  });
  it("filters requirement weights, dropping items left without a requirement", () => {
    const v = overview(graph, { weights: ["critical"] });
    expect(v.edges.filter((e) => e.kind === "requires").every((e) => e.priority === "critical")).toBe(true);
    expect(names(v)).not.toContain("Jira"); // Nice to have only
  });
});

describe("focusView", () => {
  it("1 hop from Data Engineer: its requirements, paths and nothing further", () => {
    const v = focusView(graph, "Data Engineer", 1);
    expect(v.centerId).toBe("Data Engineer");
    expect(names(v)).toEqual(
      expect.arrayContaining(["SQL", "Python", "Spark", "Databricks", "AI Engineer", "Solution Architect"]),
    );
    expect(v.nodes.every((n) => n.depth <= 1)).toBe(true);
    expect(names(v)).not.toContain("Scrum Master");
  });
  it("more hops reach further, and the depth is recorded", () => {
    const one = focusView(graph, "Data Engineer", 1);
    const two = focusView(graph, "Data Engineer", 2);
    expect(two.nodes.length).toBeGreaterThan(one.nodes.length);
    const spark = two.nodes.find((n) => n.node.name === "Spark")!;
    expect(spark.depth).toBe(1);
    expect(two.nodes.some((n) => n.depth === 2)).toBe(true);
  });
  it("caps hops at 3 and keeps only links inside the view", () => {
    const v = focusView(graph, "SQL", 9);
    expect(Math.max(...v.nodes.map((n) => n.depth))).toBeLessThanOrEqual(3);
    const ids = new Set(v.nodes.map((n) => n.node.id));
    expect(v.edges.every((e) => ids.has(e.source) && ids.has(e.target))).toBe(true);
  });
  it("keeps the centre even if a filter would hide it", () => {
    const v = focusView(graph, "Data Engineer", 1, { practiceId: "frontend" });
    expect(v.nodes.some((n) => n.node.id === "Data Engineer")).toBe(true);
  });
});

describe("roleView", () => {
  it("puts requirements in rings by weight and specialisations beside the role", () => {
    const v = roleView(graph, "Scrum Master");
    const ring = (name: string) => v.nodes.find((n) => n.node.name === name)!.ring;
    expect(ring("Scrum Master")).toBe(0);
    expect(ring("Scrum")).toBe(1); // Critical
    expect(ring("Facilitation")).toBe(2); // Important
    expect(ring("Jira")).toBe(3); // Nice
    expect(ring("SAFe")).toBe(1);
    expect(v.nodes.find((n) => n.node.name === "SAFe")!.node.type).toBe("specialization");
    expect(v.nodes.find((n) => n.node.name === "Scrum")!.weight).toBe("critical");
    // the specialisation's own requirements are not there until it is selected
    expect(v.nodes.some((n) => n.node.name === "PI Planning")).toBe(false);
  });
  it("selecting a specialisation adds its requirements, and its weight wins", () => {
    const v = roleView(graph, "Scrum Master", ["Scrum Master: Facilitation / Management 3.0"]);
    expect(v.nodes.some((n) => n.node.name === "Workshop Design")).toBe(true);
    const facilitation = v.nodes.find((n) => n.node.name === "Facilitation")!;
    expect(facilitation.weight).toBe("critical");
    expect(facilitation.ring).toBe(1);
    expect(v.edges.some((e) => e.kind === "specialization")).toBe(true);
  });
  it("has one link per requirement, none repeated", () => {
    const v = roleView(graph, "Scrum Master", ["Scrum Master: SAFe"]);
    expect(new Set(v.edges.map((e) => e.id)).size).toBe(v.edges.length);
  });
});

describe("routeBetween", () => {
  it("follows official paths", () => {
    const r = routeBetween(graph, "Data Engineer", "AI Engineer")!;
    expect(r.how).toBe("official");
    expect(r.route.map((n) => n.name)).toEqual(["Data Engineer", "AI Engineer"]);
    expect(r.view.edges).toHaveLength(1);
  });
  it("a path may run through several moves and start from a role's specialisation", () => {
    const r = routeBetween(graph, "Frontend Developer", "Solution Architect");
    expect(r?.how).toBe("official");
    expect(r!.route.length).toBeGreaterThan(2);
  });
  it("someone in a specialisation can take their role's official paths", () => {
    const r = routeBetween(graph, "Frontend Developer: React", "Full-stack Developer")!;
    expect(r.how).toBe("official");
    expect(r.route.map((n) => n.name)).toEqual(["Frontend Developer", "Full-stack Developer"]);
  });
  it("falls back to the shortest route over shared skills", () => {
    const r = routeBetween(graph, "Scrum Master", "Cloud Engineer")!;
    expect(r.how).toBe("shortest");
    expect(r.route[0].name).toBe("Scrum Master");
    expect(r.route[r.route.length - 1].name).toBe("Cloud Engineer");
    expect(r.route.length).toBeGreaterThanOrEqual(3);
    expect(r.view.edges).toHaveLength(r.route.length - 1);
  });

  it("is null when nothing connects them", () => {
    const solo = { ...graph, edges: [], out: new Map(), in: new Map() };
    expect(routeBetween(solo, "Data Engineer", "AI Engineer")).toBeNull();
  });
});

describe("neighbours and weights", () => {
  it("lists a role's requirements first, by weight, then paths", () => {
    const n = neighbours(graph, "Data Engineer");
    expect(n[0].kind).toBe("requires");
    expect(n[0].weight).toBe("critical");
    expect(n.filter((x) => x.kind === "next_step").length).toBeGreaterThan(0);
  });
  it("lists both directions for a skill", () => {
    const n = neighbours(graph, "Spark");
    expect(n.some((x) => x.kind === "builds_on" && x.direction === "out" && x.node.name === "Python")).toBe(
      true,
    );
    expect(
      n.some((x) => x.kind === "builds_on" && x.direction === "in" && x.node.name === "Databricks"),
    ).toBe(true);
    expect(
      n.some((x) => x.kind === "requires" && x.direction === "in" && x.node.name === "Data Engineer"),
    ).toBe(true);
  });
  it("gives the effective weight for a role or specialisation", () => {
    expect(weightFor(graph, "Data Engineer", "SQL")).toBe("critical");
    expect(weightFor(graph, "Data Engineer", "Jira")).toBeNull();
    expect(weightFor(graph, "Scrum Master", "Facilitation")).toBe("important");
    expect(weightFor(graph, "Scrum Master: Facilitation / Management 3.0", "Facilitation")).toBe("critical");
    expect(weightFor(graph, "SQL", "Python")).toBeNull();
  });
});

describe("myState", () => {
  const held = new Map<string, HeldItem>([
    ["SQL", { nodeId: "SQL" }],
    ["Azure Fundamentals (AZ-900)", { nodeId: "Azure Fundamentals (AZ-900)", expiresOn: "2026-08-01" }],
    [
      "Certified Kubernetes Administrator (CKA)",
      { nodeId: "Certified Kubernetes Administrator (CKA)", expiresOn: "2026-10-30" },
    ],
    ["Figma Foundation", { nodeId: "Figma Foundation", expiresOn: "2028-01-01" }],
  ]);
  const state = (id: string) => myState(graph.nodes.get(id)!, held, TODAY);
  it("held skills are met, others missing", () => {
    expect(state("SQL")).toBe("met");
    expect(state("Python")).toBe("missing");
  });
  it("certifications keep their state: an expired one is still held", () => {
    expect(state("Azure Fundamentals (AZ-900)")).toBe("expired");
    expect(state("Certified Kubernetes Administrator (CKA)")).toBe("expiring");
    expect(state("Figma Foundation")).toBe("met");
  });
  it("roles have no state", () => {
    expect(state("Data Engineer")).toBeNull();
  });
});

describe("searchNodes", () => {
  it("finds roles, specialisations and items; names that start with the text come first", () => {
    expect(searchNodes(graph, "data eng")[0].name).toBe("Data Engineer");
    expect(searchNodes(graph, "react").map((n) => n.type)).toEqual(
      expect.arrayContaining(["specialization", "technical_skill"]),
    );
    expect(searchNodes(graph, "  ")).toEqual([]);
    expect(searchNodes(graph, "a", 5)).toHaveLength(5);
  });
});
