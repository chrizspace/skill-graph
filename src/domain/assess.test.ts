import { describe, expect, it } from "vitest";
import { assess, compare, learningOrder, readiness } from "./assess";
import { buildGraph, groupByType, groupByWeight, type GraphEdge, type GraphNode } from "./graph";
import { seedGraph, seedProfile, target } from "./testing/seed-graph";

const TODAY = new Date("2026-10-10T12:00:00Z");
const graph = seedGraph();
const names = (rows: readonly { item: { name: string } }[]) => rows.map((r) => r.item.name);

describe("Scenario 1: Frontend Developer: React → Data Engineer", () => {
  it("role vs role: shares Problem Solving, Git, Agile and adds the five from the brief", () => {
    const c = compare(graph, target("Frontend Developer", "React"), target("Data Engineer"));
    expect(names(c.shared).sort()).toEqual(["Agile", "Git", "Problem Solving"]);
    expect(names(c.onlyB).sort()).toEqual(["Data Modelling", "Databricks", "Python", "SQL", "Spark"]);
    expect(names(c.onlyA)).toContain("React");
  });

  it("Alex vs Data Engineer: the same, with what's missing in learning order", () => {
    const a = assess(graph, seedProfile("seed-alex", TODAY), target("Data Engineer"), TODAY);
    expect(names(a.met).sort()).toEqual(["Agile", "Git", "Problem Solving"]);
    expect(names(a.missing)).toEqual(["SQL", "Python", "Data Modelling", "Spark", "Databricks"]);
    expect(groupByWeight(a.missing).critical.map((r) => r.item.name)).toEqual([
      "SQL",
      "Python",
      "Data Modelling",
    ]);
    expect(a.readiness).toMatchObject({ criticalMet: false, band: "far" });
  });

  it("compare with Alex's profile marks what he already has", () => {
    const c = compare(
      graph,
      target("Frontend Developer", "React"),
      target("Data Engineer"),
      seedProfile("seed-alex", TODAY),
      TODAY,
    );
    expect(c.shared.every((r) => r.has)).toBe(true);
    expect(c.onlyB.every((r) => r.has === false)).toBe(true);
  });
});

describe("Scenario 2: Project Manager → Delivery Manager", () => {
  it("Sam misses exactly the five from the brief", () => {
    const a = assess(graph, seedProfile("seed-sam", TODAY), target("Delivery Manager"), TODAY);
    expect(names(a.missing).sort()).toEqual([
      "Account Management",
      "Commercial Awareness",
      "Financial Management",
      "Leadership",
      "People Management",
    ]);
    expect(
      groupByWeight(a.missing)
        .critical.map((r) => r.item.name)
        .sort(),
    ).toEqual(["Financial Management", "Leadership", "People Management"]);
  });
});

describe("assess", () => {
  it("meets your own role when the profile was pre-filled from it", () => {
    const a = assess(graph, seedProfile("seed-alex", TODAY), target("Frontend Developer", "React"), TODAY);
    expect(names(a.missing)).toEqual(["Figma Foundation"]); // certifications aren't pre-filled
    expect(a.readiness.band).toBe("reachable");
  });

  it("gives held certifications their status; an expired one still counts as met", () => {
    const omar = assess(graph, seedProfile("seed-omar", TODAY), target("Scrum Master", "SAFe"), TODAY);
    const cert = (a: typeof omar, name: string) => a.met.find((r) => r.item.name === name)?.certification;
    expect(cert(omar, "Professional Scrum Master I (PSM I)")).toBe("valid");
    expect(cert(omar, "SAFe Scrum Master (SSM)")).toBe("expiring");

    const ella = assess(graph, seedProfile("seed-ella", TODAY), target("Business Analyst"), TODAY);
    expect(cert(ella, "Power BI Data Analyst (PL-300)")).toBe("expired");
    expect(names(ella.missing)).not.toContain("Power BI Data Analyst (PL-300)");
    expect(ella.readiness.score).toBe(1);
  });

  it("groups by item type", () => {
    const a = assess(graph, { items: [] }, target("Scrum Master"), TODAY);
    const byType = groupByType(a.missing);
    expect(names(byType.certification)).toEqual(["Professional Scrum Master I (PSM I)"]);
    expect(names(byType.soft_skill)).toContain("Coaching");
    expect(names(byType.technical_skill)).toContain("Scrum");
  });

  it("uses the specialisation's weight when it overrides the core", () => {
    const empty = { items: [] };
    const core = assess(graph, empty, target("Scrum Master"), TODAY).missing.find(
      (r) => r.item.name === "Facilitation",
    );
    const m30 = assess(
      graph,
      empty,
      target("Scrum Master", "Facilitation / Management 3.0"),
      TODAY,
    ).missing.find((r) => r.item.name === "Facilitation");
    expect(core).toMatchObject({ weight: "important", from: "core" });
    expect(m30).toMatchObject({ weight: "critical", from: "specialization" });
  });
});

describe("readiness", () => {
  it("weights Critical 3, Important 2, Nice 1 and bands the result", () => {
    // Full-stack for Alex: every Critical met; Node.js and REST APIs (Important) and SQL (Nice) missing → 16/21
    const r = readiness(graph, seedProfile("seed-alex", TODAY), target("Full-stack Developer"));
    expect(r.score).toBeCloseTo(16 / 21);
    expect(r).toMatchObject({ criticalMet: true, band: "reachable" });
  });

  it("is a stretch at half the weight, far below, and never reachable with a Critical gap", () => {
    const g = tinyGraph();
    expect(readiness(g, { items: [{ nodeId: "a" }] }, { roleId: "R" })).toMatchObject({
      score: 0.5,
      band: "stretch",
    });
    expect(readiness(g, { items: [{ nodeId: "b" }] }, { roleId: "R" })).toMatchObject({
      band: "far",
      criticalMet: false,
    });
    expect(readiness(g, { items: [{ nodeId: "b" }, { nodeId: "c" }] }, { roleId: "R" })).toMatchObject({
      score: 0.5,
      criticalMet: false,
      band: "stretch",
    });
    expect(readiness(g, { items: [{ nodeId: "a" }, { nodeId: "b" }] }, { roleId: "R" })).toMatchObject({
      score: 5 / 6,
      criticalMet: true,
      band: "reachable",
    });
  });

  it("scores a role without requirements as fully met", () => {
    const g = buildGraph([node("Empty", "role")], []);
    expect(readiness(g, { items: [] }, { roleId: "Empty" }).score).toBe(1);
  });
});

describe("learningOrder", () => {
  it("puts prerequisites first within a weight, then more-demanded items, then names", () => {
    const g = tinyGraph();
    const order = learningOrder(g, [
      { item: g.nodes.get("b")!, weight: "important" as const },
      { item: g.nodes.get("a")!, weight: "important" as const },
      { item: g.nodes.get("c")!, weight: "critical" as const },
    ]);
    expect(order.map((r) => r.item.id)).toEqual(["c", "a", "b"]); // b builds on a
  });

  it("still returns everything if items depend on each other in a cycle", () => {
    const g = buildGraph(
      [node("x", "technical_skill"), node("y", "technical_skill")],
      [edge("builds_on", "x", "y"), edge("builds_on", "y", "x")],
    );
    const order = learningOrder(g, [
      { item: g.nodes.get("x")!, weight: "nice" as const },
      { item: g.nodes.get("y")!, weight: "nice" as const },
    ]);
    expect(order.map((r) => r.item.id).sort()).toEqual(["x", "y"]);
  });
});

function node(id: string, type: GraphNode["type"], extra: Partial<GraphNode> = {}): GraphNode {
  return {
    id,
    type,
    name: id,
    slug: id,
    category: null,
    practiceId: type === "role" ? "p" : null,
    parentRoleId: null,
    status: "published",
    issuer: null,
    ...extra,
  };
}
function edge(
  kind: GraphEdge["kind"],
  sourceId: string,
  targetId: string,
  priority: GraphEdge["priority"] = null,
): GraphEdge {
  return { kind, sourceId, targetId, priority, strength: 3, note: null, typicalMonths: null };
}
/** R requires a (Critical 3), b (Important... builds on a), c; weights chosen so a = 0.5 of the total. */
function tinyGraph() {
  return buildGraph(
    [node("R", "role"), node("a", "technical_skill"), node("b", "technical_skill"), node("c", "soft_skill")],
    [
      edge("requires", "R", "a", "critical"),
      edge("requires", "R", "b", "important"),
      edge("requires", "R", "c", "nice"),
      edge("builds_on", "b", "a"),
    ],
  );
}
