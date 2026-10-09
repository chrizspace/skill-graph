import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assess, compare } from "../domain/assess";
import { roles, type Graph } from "../domain/graph";
import { pathsFor } from "../domain/paths";
import { similarRoles } from "../domain/similar";
import { loadGraph, loadProfile } from "./graph";
import { seed } from "./seed/seed";
import { createTestDb } from "./testing";

// The scenarios end to end on the database: seed → load → domain functions.
const TODAY = new Date("2026-10-10T12:00:00Z");
let t: Awaited<ReturnType<typeof createTestDb>>;
let graph: Graph;
const roleId = (name: string) => roles(graph).find((r) => r.name === name)!.id;
const names = (rows: readonly { item: { name: string } }[]) => rows.map((r) => r.item.name);

beforeAll(async () => {
  t = await createTestDb();
  await seed(t.db, { today: TODAY });
  graph = await loadGraph(t.db);
});
afterAll(async () => {
  await t.client.close();
});

describe("loaded from the database", () => {
  it("Scenario 1: Alex → Data Engineer, missing in learning order", async () => {
    const alex = (await loadProfile(t.db, "seed-alex"))!;
    const a = assess(graph, alex, { roleId: roleId("Data Engineer") }, TODAY);
    expect(names(a.met).sort()).toEqual(["Agile", "Git", "Problem Solving"]);
    expect(names(a.missing)).toEqual(["SQL", "Python", "Data Modelling", "Spark", "Databricks"]);
    const c = compare(graph, alex.current!, { roleId: roleId("Data Engineer") }, alex, TODAY);
    expect(names(c.shared).sort()).toEqual(["Agile", "Git", "Problem Solving"]);
  });

  it("Scenario 2: Sam → Delivery Manager misses exactly the five", async () => {
    const sam = (await loadProfile(t.db, "seed-sam"))!;
    const a = assess(graph, sam, { roleId: roleId("Delivery Manager") }, TODAY);
    expect(names(a.missing).sort()).toEqual([
      "Account Management",
      "Commercial Awareness",
      "Financial Management",
      "Leadership",
      "People Management",
    ]);
  });

  it("Scenario 7: Ella's expired certification counts as held, shown as expired", async () => {
    const ella = (await loadProfile(t.db, "seed-ella"))!;
    const a = assess(graph, ella, ella.current!, TODAY);
    expect(a.met.find((r) => r.item.name === "Power BI Data Analyst (PL-300)")?.certification).toBe(
      "expired",
    );
    expect(a.missing).toEqual([]);
  });

  it("similar roles and paths work on database ids", async () => {
    expect(similarRoles(graph, roleId("Scrum Master")).map((s) => s.role.name)).toContain("Project Manager");
    const ben = (await loadProfile(t.db, "seed-ben"))!;
    expect(ben.target?.specializationId).toBeTruthy();
    const paths = pathsFor(graph, ben);
    expect(paths.specializations.map((p) => p.label).sort()).toEqual([
      "Scrum Master: Facilitation / Management 3.0",
      "Scrum Master: SAFe",
    ]);
    expect(paths.official.map((p) => p.label)).toEqual(
      expect.arrayContaining(["Product Owner", "Project Manager"]),
    );
  });

  it("has no profile for an unknown person", async () => {
    expect(await loadProfile(t.db, "nobody")).toBeNull();
  });
});
