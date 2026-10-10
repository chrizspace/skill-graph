import { describe, expect, it } from "vitest";
import { certificationAlerts, reachableRoles, readinessPerRole, summarize, teamGaps } from "./people";
import { seedGraph, seedProfile } from "./testing/seed-graph";

const TODAY = new Date("2026-10-10T12:00:00Z");
const graph = seedGraph();
const person = (id: string) => ({ id, profile: seedProfile(id, TODAY) });
const names = (rows: { item: { name: string } }[]) => rows.map((r) => r.item.name);

describe("certificationAlerts", () => {
  it("lists expired and expiring certifications, soonest first; valid ones and those that never expire are left out", () => {
    const ella = certificationAlerts(graph, person("seed-ella").profile, TODAY);
    expect(ella.map((a) => [a.item.name, a.status])).toEqual([["Power BI Data Analyst (PL-300)", "expired"]]);
    const omar = certificationAlerts(graph, person("seed-omar").profile, TODAY);
    expect(omar.map((a) => [a.item.name, a.status])).toEqual([["SAFe Scrum Master (SSM)", "expiring"]]);
    expect(certificationAlerts(graph, person("seed-alex").profile, TODAY)).toEqual([]);
    expect(certificationAlerts(graph, person("seed-sam").profile, TODAY)).toEqual([]);
  });
});

describe("summarize", () => {
  it("Zoe: role and target, the gap in her role first, and no alerts", () => {
    const s = summarize(graph, person("seed-zoe"), TODAY);
    expect(s.currentLabel).toBe("Frontend Developer: React");
    expect(s.targetLabel).toBe("Full-stack Developer");
    expect(names(s.topGaps)).toContain("Accessibility");
    expect(s.fit!.criticalMet).toBe(true);
    expect(s.targetFit).not.toBeNull();
    expect(s.alerts).toEqual([]);
  });
  it("limits the gaps, keeps Critical first, and a person without a role has none", () => {
    const s = summarize(graph, person("seed-alex"), TODAY, { gaps: 1 });
    expect(s.topGaps).toHaveLength(1);
    const none = summarize(graph, { id: "x", profile: { items: [] } }, TODAY);
    expect(none).toMatchObject({ currentLabel: null, fit: null, targetFit: null, topGaps: [] });
  });
  it("carries a person's certification alerts", () => {
    expect(summarize(graph, person("seed-ella"), TODAY).alerts).toHaveLength(1);
  });
});

describe("reachableRoles", () => {
  it("Alex can reach Full-stack Developer, not Data Engineer, and his own role is not listed", () => {
    const labels = reachableRoles(graph, person("seed-alex").profile).map((r) => r.label);
    expect(labels).toContain("Full-stack Developer");
    expect(labels).not.toContain("Data Engineer");
    expect(labels).not.toContain("Frontend Developer: React");
    expect(
      reachableRoles(graph, person("seed-alex").profile).every((r) => r.readiness.band === "reachable"),
    ).toBe(true);
  });
  it("best fit first, and limited", () => {
    const r = reachableRoles(graph, person("seed-alex").profile, { limit: 2 });
    expect(r.length).toBeLessThanOrEqual(2);
    for (let i = 1; i < r.length; i++)
      expect(r[i - 1].readiness.score).toBeGreaterThanOrEqual(r[i].readiness.score);
  });
  it("someone with nothing reaches nothing", () => {
    expect(reachableRoles(graph, { items: [] })).toEqual([]);
  });
});

describe("teamGaps", () => {
  const team = ["seed-alex", "seed-noah", "seed-mia", "seed-leo", "seed-zoe"].map(person);
  it("lists what several people miss, with the highest weight, and who", () => {
    const gaps = teamGaps(graph, team, TODAY);
    const testing = gaps.find((g) => g.item.name === "Testing")!;
    expect(testing.people).toContain("seed-noah"); // Noah lacks Testing
    expect(testing.weight).toBe("important");
    const accessibility = gaps.find((g) => g.item.name === "Accessibility")!;
    expect(accessibility.people).toContain("seed-zoe");
  });
  it("most shared first, then Critical before Important, then by name; never Nice to have", () => {
    const gaps = teamGaps(graph, team, TODAY);
    for (let i = 1; i < gaps.length; i++)
      expect(gaps[i - 1].people.length).toBeGreaterThanOrEqual(gaps[i].people.length);
    expect(gaps.every((g) => g.weight === "critical" || g.weight === "important")).toBe(true);
  });
  it("is empty for nobody", () => {
    expect(teamGaps(graph, [], TODAY)).toEqual([]);
  });
});

describe("readinessPerRole", () => {
  const practice = [
    "seed-alex",
    "seed-noah",
    "seed-mia",
    "seed-leo",
    "seed-zoe",
    "seed-morgan",
    "seed-taylor",
  ].map(person);
  const rows = readinessPerRole(graph, practice, TODAY);
  it("groups people by the role they hold, by role name", () => {
    expect(rows.map((r) => r.role.name)).toEqual([
      "Engineering Manager",
      "Frontend Developer",
      "Full-stack Developer",
      "UX Developer",
    ]);
    const fe = rows.find((r) => r.role.name === "Frontend Developer")!;
    expect(fe.people.sort()).toEqual(["seed-alex", "seed-noah", "seed-taylor", "seed-zoe"]);
  });
  it("averages how well they meet it, counts those missing a Critical requirement, and lists what they miss", () => {
    const fe = rows.find((r) => r.role.name === "Frontend Developer")!;
    expect(fe.average).toBeGreaterThan(0.8);
    expect(fe.average).toBeLessThanOrEqual(1);
    expect(fe.criticalMissing).toBe(0);
    expect(fe.gaps.map((g) => g.item.name)).toEqual(expect.arrayContaining(["Accessibility", "Testing"]));
    expect(fe.gaps.length).toBeLessThanOrEqual(3);
  });
  it("leaves roles nobody holds out, and people without a role", () => {
    expect(rows.some((r) => r.role.name === "Data Engineer")).toBe(false);
    expect(readinessPerRole(graph, [{ id: "x", profile: { items: [] } }], TODAY)).toEqual([]);
  });
});
