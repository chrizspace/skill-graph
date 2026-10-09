import { describe, expect, it } from "vitest";
import { pathsFor } from "./paths";
import { developmentPlan } from "./plan";
import { similarity, similarRoles } from "./similar";
import { seedGraph, seedProfile, target } from "./testing/seed-graph";

const TODAY = new Date("2026-10-10T12:00:00Z");
const graph = seedGraph();

describe("similarRoles", () => {
  it("finds Project Manager and Product Owner for Scrum Master, with the synergies", () => {
    const similar = similarRoles(graph, "Scrum Master");
    const names = similar.map((s) => s.role.name);
    expect(names).toContain("Project Manager");
    expect(names).toContain("Product Owner");
    const pm = similar.find((s) => s.role.name === "Project Manager")!;
    expect(pm.score).toBeGreaterThan(0.25);
    expect(pm.shared.map((s) => s.item.name)).toEqual(
      expect.arrayContaining(["Agile", "Communication", "Facilitation", "Stakeholder Management"]),
    );
    expect(pm.onlyThis.map((s) => s.item.name)).toContain("Scrum");
    expect(pm.onlyOther.map((s) => s.item.name)).toContain("Planning & Scheduling");
  });

  it("is symmetric, 1 for a role with itself, and 0 for unrelated roles", () => {
    expect(similarity(graph, "Scrum Master", "Project Manager")).toBeCloseTo(
      similarity(graph, "Project Manager", "Scrum Master"),
    );
    expect(similarity(graph, "Data Engineer", "Data Engineer")).toBe(1);
    expect(similarity(graph, "Security Engineer", "UX Developer")).toBe(0);
  });

  it("never lists the role itself, respects the limit and threshold, most similar first", () => {
    const similar = similarRoles(graph, "Frontend Developer", { limit: 2, threshold: 0 });
    expect(similar).toHaveLength(2);
    expect(similar.map((s) => s.role.name)).not.toContain("Frontend Developer");
    expect(similar[0].score).toBeGreaterThanOrEqual(similar[1].score);
    expect(similar[0].role.name).toBe("Full-stack Developer");
  });
});

describe("pathsFor", () => {
  it("gives Alex the official path to Full-stack, the Angular specialisation, and suggestions", () => {
    const paths = pathsFor(graph, seedProfile("seed-alex", TODAY));
    const fullStack = paths.official.find((p) => p.label === "Full-stack Developer")!;
    expect(fullStack).toMatchObject({
      route: ["Full-stack Developer"],
      typicalMonths: 12,
      readiness: { band: "reachable" },
    });
    expect(fullStack.note).toMatch(/Node\.js/);
    // two hops away through Full-stack
    expect(paths.official.find((p) => p.label === "Solution Architect")?.route).toEqual([
      "Full-stack Developer",
      "Solution Architect",
    ]);
    expect(paths.specializations.map((p) => p.label)).toEqual(["Frontend Developer: Angular"]);
    expect(paths.suggested.length).toBeGreaterThan(0);
    for (const s of paths.suggested) {
      expect(paths.official.map((o) => o.target.roleId)).not.toContain(s.target.roleId);
      expect(s.target.roleId).not.toBe("Frontend Developer");
    }
  });

  it("adds up durations while every hop has one, and stops at the hop limit", () => {
    const sam = pathsFor(graph, seedProfile("seed-sam", TODAY), { maxHops: 1 });
    expect(sam.official.map((p) => p.label)).toEqual(["Delivery Manager"]);
    expect(sam.official[0].typicalMonths).toBe(24);
    const alex = pathsFor(graph, seedProfile("seed-alex", TODAY));
    expect(alex.official.find((p) => p.label === "Solution Architect")?.typicalMonths).toBeNull();
  });

  it("is empty without a current role", () => {
    expect(pathsFor(graph, { items: [] })).toEqual({ official: [], specializations: [], suggested: [] });
  });
});

describe("developmentPlan", () => {
  it("lists Ben's gaps for the Management 3.0 specialisation in learning order", () => {
    const plan = developmentPlan(
      graph,
      seedProfile("seed-ben", TODAY),
      target("Scrum Master", "Facilitation / Management 3.0"),
      [],
      TODAY,
    );
    expect(plan.label).toBe("Scrum Master: Facilitation / Management 3.0");
    expect(plan.steps.map((s) => s.item.name)).toEqual([
      "Management 3.0 Practices",
      "Management 3.0 Foundation",
      "Workshop Design",
      "Liberating Structures",
    ]);
    expect(plan.steps.every((s) => !s.recommended)).toBe(true);
  });

  it("marks accepted recommendations, lists extra ones, and flags certifications to renew", () => {
    const plan = developmentPlan(
      graph,
      seedProfile("seed-omar", TODAY),
      target("Scrum Master", "SAFe"),
      [
        { nodeId: "PI Planning", status: "accepted" },
        { nodeId: "Liberating Structures", status: "accepted" },
        { nodeId: "Kubernetes", status: "declined" },
      ],
      TODAY,
    );
    expect(plan.steps).toEqual([]); // Omar meets every SAFe requirement
    expect(plan.recommendedExtras.map((n) => n.name)).toEqual(["Liberating Structures"]);
    expect(plan.toRenew.map((r) => [r.item.name, r.certification])).toEqual([
      ["SAFe Scrum Master (SSM)", "expiring"],
    ]);
    expect(plan.progress.score).toBe(1);

    const zoe = developmentPlan(
      graph,
      seedProfile("seed-zoe", TODAY),
      target("Full-stack Developer"),
      [{ nodeId: "Accessibility", status: "accepted" }],
      TODAY,
    );
    expect(zoe.recommendedExtras.map((n) => n.name)).toEqual(["Accessibility"]);
    // REST APIs before Node.js: more roles require it
    expect(zoe.steps.map((s) => s.item.name)).toEqual(["REST APIs", "Node.js", "SQL"]);
  });
});
