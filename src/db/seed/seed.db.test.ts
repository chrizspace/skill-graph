import { count } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { slugify } from "../../domain/names";
import { createTestDb } from "../testing";
import { edges, nodes, profiles, profileSkills, user } from "../schema";
import { hasGraphData, seed } from "./seed";

type Priority = "critical" | "important" | "nice";
let t: Awaited<ReturnType<typeof createTestDb>>;
let allNodes: (typeof nodes.$inferSelect)[];
let allEdges: (typeof edges.$inferSelect)[];
const nameOf = (id: string) => allNodes.find((n) => n.id === id)!.name;
const nodeNamed = (name: string) => {
  const node = allNodes.find((n) => n.name === name);
  if (!node) throw new Error(`no node named ${name}`);
  return node;
};

beforeAll(async () => {
  t = await createTestDb();
  expect(await hasGraphData(t.db)).toBe(false);
  await seed(t.db);
  allNodes = await t.db.select().from(nodes);
  allEdges = await t.db.select().from(edges);
});
afterAll(async () => {
  await t.client.close();
});

function requirementsOf(role: string) {
  const roleId = nodeNamed(role).id;
  const result: Record<Priority, string[]> = { critical: [], important: [], nice: [] };
  for (const e of allEdges.filter((e) => e.kind === "requires" && e.sourceId === roleId)) {
    result[e.priority!].push(nameOf(e.targetId));
  }
  for (const list of Object.values(result)) list.sort();
  return result;
}
const all = (r: Record<Priority, string[]>) => new Set([...r.critical, ...r.important, ...r.nice]);
const baseline = (r: Record<Priority, string[]>) => new Set([...r.critical, ...r.important]);
const sorted = (s: Iterable<string>) => [...s].sort();

async function declaredBy(userId: string) {
  const rows = await t.db.select().from(profileSkills);
  return rows.filter((r) => r.userId === userId).map((r) => nameOf(r.nodeId));
}

describe("size and shape", () => {
  it("has about 15 roles, 60 skills and 40 technologies", () => {
    const byType = (type: string) => allNodes.filter((n) => n.type === type).length;
    expect(byType("role")).toBeGreaterThanOrEqual(15);
    expect(byType("skill")).toBeGreaterThanOrEqual(55);
    expect(byType("technology")).toBeGreaterThanOrEqual(35);
  });

  it("covers every example named in the brief", () => {
    const examples = {
      role: [
        "Frontend Developer",
        "Data Engineer",
        "AI Engineer",
        "Project Manager",
        "Delivery Manager",
        "Business Analyst",
        "Solution Architect",
        "Security Engineer",
      ],
      skill: [
        "JavaScript",
        "TypeScript",
        "Python",
        "SQL",
        "Leadership",
        "Stakeholder Management",
        "Data Modelling",
        "Problem Solving",
        "Agile",
        "Financial Management",
        "Account Management",
        "Commercial Awareness",
        "People Management",
      ],
      technology: [
        "React",
        "Databricks",
        "Microsoft Fabric",
        "Azure",
        "Power BI",
        "GitHub Copilot",
        "Git",
        "Spark",
        "Azure Data Factory",
        "Terraform",
        "Snowflake",
      ],
    };
    for (const [type, names] of Object.entries(examples)) {
      for (const name of names) expect(nodeNamed(name).type, name).toBe(type);
    }
  });

  it("gives every node a description, a category and the slug its name implies", () => {
    for (const n of allNodes) {
      expect(n.description.length, n.name).toBeGreaterThan(10);
      expect(n.category, n.name).toBeTruthy();
      expect(n.slug).toBe(slugify(n.name));
    }
  });

  it("leaves no skill or technology unconnected and gives every role a critical requirement", () => {
    const linked = new Set(allEdges.flatMap((e) => [e.sourceId, e.targetId]));
    for (const n of allNodes.filter((n) => n.type !== "role")) expect(linked.has(n.id), n.name).toBe(true);
    for (const n of allNodes.filter((n) => n.type === "role")) {
      expect(requirementsOf(n.name).critical.length, n.name).toBeGreaterThan(0);
    }
  });
});

describe("link rules", () => {
  it("connects the right node types for every kind of link", () => {
    const type = (id: string) => allNodes.find((n) => n.id === id)!.type;
    for (const e of allEdges) {
      const pair = `${type(e.sourceId)}→${type(e.targetId)}`;
      const label = `${e.kind}: ${nameOf(e.sourceId)} → ${nameOf(e.targetId)}`;
      if (e.kind === "requires") expect(["role→skill", "role→technology"], label).toContain(pair);
      if (e.kind === "next_step") expect(pair, label).toBe("role→role");
      if (e.kind === "builds_on" || e.kind === "related_to") expect(pair, label).not.toMatch(/role/);
    }
  });

  it("has no cycles in builds_on", () => {
    const next = new Map<string, string[]>();
    for (const e of allEdges.filter((e) => e.kind === "builds_on")) {
      next.set(e.sourceId, [...(next.get(e.sourceId) ?? []), e.targetId]);
    }
    const state = new Map<string, "visiting" | "done">();
    const visit = (id: string, path: string[]): void => {
      if (state.get(id) === "done") return;
      if (state.get(id) === "visiting") throw new Error(`cycle: ${[...path, id].map(nameOf).join(" → ")}`);
      state.set(id, "visiting");
      for (const to of next.get(id) ?? []) visit(to, [...path, id]);
      state.set(id, "done");
    };
    for (const id of next.keys()) visit(id, []);
  });

  it("has the prerequisites the brief names", () => {
    const has = (from: string, to: string) =>
      allEdges.some(
        (e) => e.kind === "builds_on" && e.sourceId === nodeNamed(from).id && e.targetId === nodeNamed(to).id,
      );
    expect(has("Databricks", "Python")).toBe(true);
    expect(has("Databricks", "Spark")).toBe(true);
    expect(has("Spark", "Python")).toBe(true);
  });
});

describe("requirements fixed by the scenarios", () => {
  it.each([
    [
      "Frontend Developer",
      {
        critical: ["HTML & CSS", "JavaScript", "Problem Solving", "React", "TypeScript"],
        important: ["Accessibility", "Agile", "Git", "Testing"],
        nice: ["GitHub Copilot", "Next.js"],
      },
    ],
    [
      "Data Engineer",
      {
        critical: ["Data Modelling", "Problem Solving", "Python", "SQL"],
        important: ["Databricks", "Git", "Spark"],
        nice: ["Agile"],
      },
    ],
    [
      "Full-stack Developer",
      {
        critical: ["JavaScript", "Problem Solving", "React", "TypeScript"],
        important: ["Agile", "Git", "Node.js", "REST APIs"],
        nice: ["SQL"],
      },
    ],
    [
      "Project Manager",
      {
        critical: ["Communication", "Planning & Scheduling", "Risk Management", "Stakeholder Management"],
        important: ["Agile", "Azure DevOps"],
        nice: ["Change Management", "Estimation", "Jira"],
      },
    ],
    [
      "Delivery Manager",
      {
        critical: [
          "Communication",
          "Financial Management",
          "Leadership",
          "People Management",
          "Stakeholder Management",
        ],
        important: ["Account Management", "Commercial Awareness", "Risk Management"],
        nice: ["Agile"],
      },
    ],
  ])("%s", (role, expected) => {
    expect(requirementsOf(role)).toEqual(expected);
  });

  // Until the domain functions arrive (M2) these use plain set operations on the seeded data.
  it("Scenario 1, role vs role: Frontend Developer → Data Engineer", () => {
    const from = all(requirementsOf("Frontend Developer"));
    const to = all(requirementsOf("Data Engineer"));
    expect(sorted([...to].filter((s) => from.has(s)))).toEqual(["Agile", "Git", "Problem Solving"]);
    expect(sorted([...to].filter((s) => !from.has(s)))).toEqual([
      "Data Modelling",
      "Databricks",
      "Python",
      "SQL",
      "Spark",
    ]);
  });

  it("Scenario 1, person vs role: Alex (declared + Frontend Developer baseline) → Data Engineer", async () => {
    const has = new Set([
      ...(await declaredBy("seed-alex")),
      ...baseline(requirementsOf("Frontend Developer")),
    ]);
    const to = all(requirementsOf("Data Engineer"));
    expect(sorted([...to].filter((s) => has.has(s)))).toEqual(["Agile", "Git", "Problem Solving"]);
    expect(sorted([...to].filter((s) => !has.has(s)))).toEqual([
      "Data Modelling",
      "Databricks",
      "Python",
      "SQL",
      "Spark",
    ]);
  });

  it("Scenario 2: Sam (Project Manager) → Delivery Manager misses exactly the five from the brief", async () => {
    const has = new Set([...(await declaredBy("seed-sam")), ...baseline(requirementsOf("Project Manager"))]);
    const missing = [...all(requirementsOf("Delivery Manager"))].filter((s) => !has.has(s));
    expect(sorted(missing)).toEqual([
      "Account Management",
      "Commercial Awareness",
      "Financial Management",
      "Leadership",
      "People Management",
    ]);
  });
});

describe("demo people", () => {
  it("seeds the four people with their roles, managers and declared skills", async () => {
    const people = await t.db.select().from(user);
    expect(people.map((p) => p.email).sort()).toEqual([
      "alex.rivera@example.com",
      "jordan.kim@example.com",
      "morgan.lee@example.com",
      "sam.patel@example.com",
    ]);
    const byId = new Map((await t.db.select().from(profiles)).map((p) => [p.userId, p]));
    const roleOf = (id: string) => nameOf(byId.get(id)!.currentRoleId!);
    expect(roleOf("seed-alex")).toBe("Frontend Developer");
    expect(roleOf("seed-sam")).toBe("Project Manager");
    expect(byId.get("seed-alex")).toMatchObject({ appRole: "employee", managerId: "seed-morgan" });
    expect(byId.get("seed-sam")).toMatchObject({ appRole: "employee", managerId: "seed-morgan" });
    expect(byId.get("seed-morgan")).toMatchObject({ appRole: "manager", managerId: null });
    expect(byId.get("seed-jordan")).toMatchObject({ appRole: "admin" });
    expect((await declaredBy("seed-alex")).sort()).toEqual(["JavaScript", "React", "TypeScript"]);
  });
});

describe("re-running", () => {
  it("adds nothing the second time and keeps the counts", async () => {
    const counts = async () => ({
      nodes: (await t.db.select({ n: count() }).from(nodes))[0].n,
      edges: (await t.db.select({ n: count() }).from(edges))[0].n,
      people: (await t.db.select({ n: count() }).from(user))[0].n,
    });
    const before = await counts();
    expect(await seed(t.db)).toEqual({ nodes: 0, links: 0, people: 0 });
    expect(await counts()).toEqual(before);
    expect(await hasGraphData(t.db)).toBe(true);
  });

  it("can seed the graph without demo people (production)", async () => {
    const fresh = await createTestDb();
    const added = await seed(fresh.db, { demoPeople: false });
    expect(added.people).toBe(0);
    expect(added.nodes).toBe(allNodes.length);
    expect(await fresh.db.select().from(user)).toHaveLength(0);
    await fresh.client.close();
  });
});
