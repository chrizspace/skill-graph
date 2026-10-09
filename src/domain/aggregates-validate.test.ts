import { describe, expect, it } from "vitest";
import { aggregateByGroup, benchStrength, closestTo, gapsAcross, type Person } from "./aggregates";
import { seedPeople } from "./testing/seed-graph";
import { checkLink, impactOfDeleting, nameTaken, validateChanges, wouldCreateCycle } from "./validate";
import { seedGraph, seedProfile, target } from "./testing/seed-graph";

const TODAY = new Date("2026-10-10T12:00:00Z");
const graph = seedGraph();
const person = (id: string): Person => ({ id, profile: seedProfile(id, TODAY) });
const team = ["seed-alex", "seed-noah", "seed-mia", "seed-leo", "seed-zoe"].map(person);

describe("aggregates", () => {
  it("lists the team's gaps for current roles and targets, most common first", () => {
    const gaps = gapsAcross(graph, team, TODAY);
    const byName = new Map(gaps.map((g) => [g.item.name, g.people]));
    expect(byName.get("Testing")).toEqual(["seed-noah"]);
    expect(byName.get("Accessibility")).toEqual(["seed-zoe"]);
    // Zoe's target is Full-stack: Node.js and REST APIs (Important) are gaps; SQL (Nice) isn't counted
    expect(byName.get("Node.js")).toEqual(["seed-zoe"]);
    expect(byName.has("SQL")).toBe(false);
    expect(gaps[0].people.length).toBeGreaterThanOrEqual(gaps.at(-1)!.people.length);
  });

  it("ranks who is closest to a role (succession) and counts the bench", () => {
    const ranking = closestTo(graph, team, target("Full-stack Developer"));
    expect(ranking[0].personId).toBe("seed-leo"); // already a Full-stack Developer
    const [bench] = benchStrength(graph, team, [target("Full-stack Developer")]);
    expect(bench.label).toBe("Full-stack Developer");
    expect(bench.reachable).toBeGreaterThanOrEqual(2);
    expect(bench.reachable + bench.stretch).toBeLessThanOrEqual(team.length);
  });

  it("hides groups smaller than five", () => {
    const groups = aggregateByGroup(
      new Map([
        ["frontend", team],
        ["data-ai", [person("seed-avery")]],
      ]),
      (people) => people.length,
    );
    expect(groups).toEqual([
      { key: "frontend", size: 5, hidden: false, value: 5 },
      { key: "data-ai", size: 1, hidden: true, value: null },
    ]);
  });

  it("builds the whole seeded team from the seed data", () => {
    expect(seedPeople().filter((p) => p.managerId === "seed-morgan")).toHaveLength(5);
  });
});

describe("validation", () => {
  it("detects builds_on loops", () => {
    expect(wouldCreateCycle(graph, "Spark", "Databricks")).toBe(true); // Databricks already builds on Spark
    expect(wouldCreateCycle(graph, "Python", "Python")).toBe(true);
    expect(wouldCreateCycle(graph, "Databricks", "Azure")).toBe(false);
  });

  it("checks link types, weights, duplicates and loops", () => {
    expect(
      checkLink(graph, { kind: "requires", sourceId: "Data Engineer", targetId: "Azure", priority: "nice" }),
    ).toEqual({
      problems: [],
      warnings: [],
    });
    expect(
      checkLink(graph, { kind: "requires", sourceId: "Data Engineer", targetId: "Azure" }).problems,
    ).toContain("A requirement needs a weight.");
    expect(
      checkLink(graph, { kind: "requires", sourceId: "SQL", targetId: "Azure", priority: "nice" })
        .problems[0],
    ).toMatch(/role or specialisation/);
    expect(
      checkLink(graph, { kind: "next_step", sourceId: "Data Engineer", targetId: "SQL" }).problems[0],
    ).toMatch(/path/);
    expect(
      checkLink(graph, { kind: "builds_on", sourceId: "Python", targetId: "SQL", priority: "nice" }).problems,
    ).toContain("Only requirements have a weight.");
    expect(
      checkLink(graph, { kind: "requires", sourceId: "Data Engineer", targetId: "SQL", priority: "nice" })
        .problems,
    ).toContain("Data Engineer → SQL already exists.");
    expect(
      checkLink(graph, { kind: "related_to", sourceId: "Bicep", targetId: "Terraform" }).problems,
    ).toContain("Bicep → Terraform already exists.");
    expect(
      checkLink(graph, { kind: "builds_on", sourceId: "Spark", targetId: "Databricks" }).warnings[0],
    ).toMatch(/loop/);
    expect(checkLink(graph, { kind: "builds_on", sourceId: "SQL", targetId: "SQL" }).problems).toContain(
      "SQL can't be linked to itself.",
    );
    expect(checkLink(graph, { kind: "builds_on", sourceId: "SQL", targetId: "nope" }).problems).toEqual([
      "Both ends of the link must exist.",
    ]);
  });

  it("knows which names are taken, per role for specialisations", () => {
    expect(nameTaken(graph, "  python ")).toBe(true);
    expect(nameTaken(graph, "Kanban")).toBe(false);
    expect(nameTaken(graph, "React")).toBe(true); // the technical skill
    expect(nameTaken(graph, "React", { parentRoleId: "Frontend Developer" })).toBe(true);
    expect(nameTaken(graph, "React", { parentRoleId: "Scrum Master" })).toBe(false);
    expect(nameTaken(graph, "Python", { exceptId: "Python" })).toBe(false);
  });

  it("shows what deleting a node takes with it", () => {
    const impact = impactOfDeleting(graph, "Frontend Developer");
    expect(impact.specializations).toEqual(["Angular", "React"]);
    expect(impact.links).toBeGreaterThan(10);
    expect(impactOfDeleting(graph, "Spark").requiredBy).toEqual(["Data Engineer"]);
  });
});

describe("validateChanges", () => {
  const frontend = { practiceId: "frontend", roleId: "Frontend Developer" };

  it("accepts the seeded requests", () => {
    expect(
      validateChanges(graph, frontend, [
        {
          op: "add_requirement",
          newItem: { name: "Playwright", type: "technical_skill" },
          priority: "important",
        },
      ]),
    ).toEqual([]);
    expect(validateChanges(graph, frontend, [{ op: "remove_requirement", itemId: "Accessibility" }])).toEqual(
      [],
    );
    expect(
      validateChanges(graph, { practiceId: "delivery", roleId: "Scrum Master" }, [
        { op: "update_requirement", itemId: "Jira", priority: "important" },
        { op: "propose_specialization", name: "Kanban", description: "Flow-based teams." },
        { op: "add_path", toId: "Delivery Manager" },
        { op: "remove_path", toId: "Product Owner" },
        { op: "update_description", description: "New text." },
      ]),
    ).toEqual([]);
    expect(
      validateChanges(graph, { practiceId: "frontend", roleId: null }, [
        { op: "propose_role", name: "Platform Engineer", description: "x" },
      ]),
    ).toEqual([]);
  });

  it("explains what no longer applies", () => {
    expect(
      validateChanges(graph, frontend, [{ op: "add_requirement", itemId: "JavaScript", priority: "nice" }]),
    ).toEqual(["Frontend Developer already requires JavaScript."]);
    expect(
      validateChanges(graph, frontend, [
        { op: "add_requirement", itemId: "Data Engineer", priority: "nice" },
      ])[0],
    ).toMatch(/skill or certification/);
    expect(
      validateChanges(graph, frontend, [
        { op: "add_requirement", newItem: { name: "python", type: "technical_skill" }, priority: "nice" },
      ])[0],
    ).toMatch(/already exists/);
    expect(validateChanges(graph, frontend, [{ op: "remove_requirement", itemId: "SQL" }])).toEqual([
      "Frontend Developer doesn't require SQL.",
    ]);
    expect(validateChanges(graph, frontend, [{ op: "update_requirement", itemId: "Testing" }])).toEqual([
      "Nothing to change for Testing.",
    ]);
    expect(validateChanges(graph, frontend, [{ op: "remove_path", toId: "Data Engineer" }])[0]).toMatch(
      /no path/,
    );
    expect(validateChanges(graph, frontend, [{ op: "add_path", toId: "Full-stack Developer" }])[0]).toMatch(
      /already exists/,
    );
    expect(validateChanges(graph, frontend, [{ op: "add_path", toId: "SQL" }])[0]).toMatch(
      /role or specialisation/,
    );
    expect(
      validateChanges(graph, frontend, [
        { op: "propose_specialization", name: "react", description: "x" },
      ])[0],
    ).toMatch(/already has a specialisation/);
    expect(
      validateChanges(graph, { practiceId: "frontend", roleId: "Frontend Developer: React" }, [
        { op: "propose_specialization", name: "Hooks", description: "x" },
      ]),
    ).toEqual(["Specialisations can only be proposed for a role."]);
    expect(
      validateChanges(graph, { practiceId: "frontend", roleId: null }, [
        { op: "propose_role", name: "Scrum Master", description: "x" },
      ]),
    ).toEqual(['"Scrum Master" already exists.']);
  });

  it("checks the request belongs to the practice and has a role when it needs one", () => {
    expect(
      validateChanges(graph, { practiceId: "delivery", roleId: "Frontend Developer" }, [
        { op: "remove_requirement", itemId: "Testing" },
      ]),
    ).toEqual(["Frontend Developer isn't a role of this practice."]);
    expect(
      validateChanges(graph, { practiceId: "frontend", roleId: "Gone" }, [
        { op: "remove_requirement", itemId: "Testing" },
      ]),
    ).toEqual(["The role this request is about no longer exists."]);
    expect(
      validateChanges(graph, { practiceId: "frontend", roleId: null }, [
        { op: "remove_requirement", itemId: "Testing" },
      ]),
    ).toEqual(["Only a new-role proposal can be made without a role."]);
    expect(
      validateChanges(graph, frontend, [
        { op: "remove_requirement", itemId: "Testing" },
        { op: "update_requirement", itemId: "Testing", priority: "nice" },
      ]),
    ).toContain("Testing appears more than once in this request.");
  });
});
