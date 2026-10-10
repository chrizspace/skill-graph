import { describe, expect, it } from "vitest";
import { planMerge, reportingCycle, siteOverview } from "./site";
import { buildGraph, type GraphEdge, type GraphNode } from "./graph";
import { seedGraph, seedProfile } from "./testing/seed-graph";
import { people as seedPeople } from "../db/seed/data";

const TODAY = new Date("2026-10-10T12:00:00Z");
const graph = seedGraph();
const practices = [
  { id: "frontend", name: "Frontend Practice" },
  { id: "backend-architecture", name: "Backend & Architecture" },
  { id: "data-ai", name: "Data & AI" },
  { id: "cloud-security", name: "Cloud & Security" },
  { id: "delivery", name: "Delivery Management" },
];
const people = seedPeople.map((p) => ({
  id: p.id,
  practiceId: p.practice,
  profile: seedProfile(p.id, TODAY),
}));

describe("siteOverview", () => {
  const overview = siteOverview(graph, people, practices, TODAY);

  it("hides every group of fewer than 5 people, and shows the ones with 5 or more", () => {
    const byName = Object.fromEntries(overview.practices.map((g) => [g.name, g]));
    expect(byName["Frontend Practice"]).toMatchObject({ size: 7, hidden: false });
    expect(byName["Delivery Management"]).toMatchObject({ size: 7, hidden: false });
    for (const small of ["Backend & Architecture", "Data & AI", "Cloud & Security"]) {
      expect(byName[small].hidden, small).toBe(true);
      expect(byName[small].value, small).toBeNull();
    }
    const hiddenRoles = overview.roles.filter((r) => r.hidden);
    expect(hiddenRoles.length).toBeGreaterThan(0);
    expect(overview.roles.every((r) => r.size < 5 === r.hidden)).toBe(true);
  });

  it("gives numbers for a shown group: average fit, who still misses a Critical requirement, the gaps with counts", () => {
    const frontend = overview.practices.find((g) => g.name === "Frontend Practice")!.value!;
    expect(frontend.averageFit).toBeGreaterThan(0.5);
    expect(frontend.averageFit).toBeLessThanOrEqual(1);
    expect(frontend.criticalMissing).toBe(0);
    expect(frontend.gaps.length).toBeLessThanOrEqual(5);
    expect(frontend.gaps.map((g) => g.item.name)).toEqual(expect.arrayContaining(["Accessibility"]));
  });

  it("withholds a small count inside a shown group, as it would point at a person (Accessibility: only Zoe lacks it)", () => {
    const frontend = overview.practices.find((g) => g.name === "Frontend Practice")!.value!;
    for (const g of frontend.gaps) expect(g.count === null || g.count >= 5, g.item.name).toBe(true);
    expect(frontend.gaps.find((g) => g.item.name === "Accessibility")!.count).toBeNull();
    // zero is no disclosure, and a count of 5 or more is shown as it is
    const everyone = siteOverview(graph, people, practices, TODAY, 1);
    expect(
      everyone.practices
        .find((g) => g.name === "Frontend Practice")!
        .value!.gaps.find((g) => g.item.name === "Accessibility")!.count,
    ).toBe(1);
  });

  it("never names anyone: no person's id or name appears anywhere in the result", () => {
    const text = JSON.stringify(overview);
    for (const p of seedPeople) {
      expect(text, p.id).not.toContain(p.id);
      expect(text, p.name).not.toContain(p.name);
      expect(text, p.email).not.toContain(p.email);
    }
  });

  it("bench strength is counts per role over the whole site, and empty for a site that is too small", () => {
    const de = overview.bench.find((b) => b.label === "Data Engineer")!;
    for (const b of overview.bench) {
      for (const n of [b.reachable, b.stretch]) expect(n === null || n === 0 || n >= 5, b.label).toBe(true);
    }
    expect(Object.keys(de).sort()).toEqual(["label", "reachable", "stretch", "target"]);
    expect(siteOverview(graph, people.slice(0, 4), practices, TODAY).bench).toEqual([]);
  });

  it("a lower minimum shows smaller groups", () => {
    const o = siteOverview(graph, people, practices, TODAY, 1);
    expect(o.practices.every((g) => !g.hidden || g.size === 0)).toBe(true);
  });
});

describe("planMerge", () => {
  const n = (id: string, type: GraphNode["type"], name = id): GraphNode => ({
    id,
    type,
    name,
    slug: id,
    category: null,
    practiceId: null,
    parentRoleId: null,
    status: "published",
    issuer: null,
  });
  const e = (
    kind: GraphEdge["kind"],
    sourceId: string,
    targetId: string,
    priority: GraphEdge["priority"] = null,
  ): GraphEdge => ({
    kind,
    sourceId,
    targetId,
    priority,
    strength: 3,
    note: null,
    typicalMonths: null,
  });
  const nodes = [
    n("r1", "role"),
    n("r2", "role"),
    n("r3", "role"),
    n("k8s", "technical_skill", "Kubernetes"),
    n("k8", "technical_skill", "K8s"),
    n("docker", "technical_skill"),
    n("helm", "technical_skill"),
    n("soft", "soft_skill"),
  ];
  const base = [
    e("requires", "r1", "k8s", "important"),
    e("requires", "r1", "k8", "critical"), // r1 has both: the stronger weight wins
    e("requires", "r2", "k8", "nice"), // moves
    e("builds_on", "k8", "docker"),
    e("builds_on", "helm", "k8"),
    e("related_to", "k8", "k8s"), // would link the item to itself
  ];
  const g = buildGraph(nodes, base);

  it("moves what is only on the dropped item, merges what both have, and drops what would loop", () => {
    const plan = planMerge(g, "k8s", "k8");
    expect(plan.problems).toEqual([]);
    expect(plan.moves.map((m) => `${m.edge.kind}:${m.sourceId}>${m.targetId}`).sort()).toEqual(
      ["builds_on:helm>k8s", "builds_on:k8s>docker", "requires:r2>k8s"].sort(),
    );
    expect(plan.requirementsMoved).toBe(1);
    expect(plan.linksMoved).toBe(2);
    expect(plan.requirementConflicts).toEqual([
      { owner: "r1", kept: "important", dropped: "critical", result: "critical" },
    ]);
    expect(plan.upgrades).toEqual([{ edge: base[0], priority: "critical" }]);
    expect(plan.drops.map((d) => d.why).sort()).toEqual([
      "it would link the item to itself",
      "the kept item already has it",
    ]);
    expect(plan.linksDropped).toBe(2);
  });

  it("refuses the same item, different types, unknown things and roles", () => {
    expect(planMerge(g, "k8s", "k8s").problems.join()).toContain("two different");
    expect(planMerge(g, "k8s", "soft").problems.join()).toContain("same type");
    expect(planMerge(g, "k8s", "nope").problems.join()).toContain("skills or certifications");
    expect(planMerge(g, "k8s", "r1").problems.join()).toContain("skills or certifications");
  });

  it("drops a prerequisite link that would close a loop", () => {
    // k8 builds on docker, and docker builds on k8s: moving k8 -> k8s would make k8s build on docker, which builds on k8s
    const loop = buildGraph(nodes, [e("builds_on", "k8", "docker"), e("builds_on", "docker", "k8s")]);
    const plan = planMerge(loop, "k8s", "k8");
    expect(plan.moves).toEqual([]);
    expect(plan.drops.map((d) => d.why)).toEqual(["it would make a prerequisite loop"]);
  });

  it("a requirement the kept item already has at a stronger weight stays as it is", () => {
    const g2 = buildGraph(nodes, [e("requires", "r1", "k8s", "critical"), e("requires", "r1", "k8", "nice")]);
    const plan = planMerge(g2, "k8s", "k8");
    expect(plan.requirementConflicts[0].result).toBe("critical");
    expect(plan.upgrades).toEqual([]);
  });

  it("works on the real catalogue: merging two skills of the seed", () => {
    const plan = planMerge(graph, "Terraform", "Bicep");
    expect(plan.problems).toEqual([]);
    expect(plan.linksMoved + plan.linksDropped + plan.requirementsMoved).toBeGreaterThan(0);
  });
});

describe("reportingCycle", () => {
  const managerOf = new Map<string, string | null>([
    ["a", null],
    ["b", "a"],
    ["c", "b"],
  ]);
  it("a person can't end up managing their own manager, however indirectly", () => {
    expect(reportingCycle(managerOf, "a", "c")).toBe(true);
    expect(reportingCycle(managerOf, "a", "b")).toBe(true);
    expect(reportingCycle(managerOf, "a", "a")).toBe(true);
  });
  it("other changes are fine", () => {
    expect(reportingCycle(managerOf, "c", "a")).toBe(false);
    expect(reportingCycle(managerOf, "b", null)).toBe(false);
    expect(reportingCycle(managerOf, "x", "c")).toBe(false);
  });
  it("an existing loop elsewhere doesn't hang it", () => {
    const loop = new Map<string, string | null>([
      ["p", "q"],
      ["q", "p"],
    ]);
    expect(reportingCycle(loop, "z", "p")).toBe(false);
  });
});
