import { count } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { changesSchema } from "../../domain/change-requests";
import { slugify, specializationSlug } from "../../domain/names";
import { createTestDb } from "../testing";
import {
  changeRequestComments,
  changeRequests,
  edges,
  nodes,
  practiceLeads,
  practices,
  profileItems,
  profiles,
  recommendations,
  siteLeads,
  sites,
  user,
} from "../schema";
import { hasGraphData, seed } from "./seed";

type Weight = "critical" | "important" | "nice";
const TODAY = new Date("2026-10-10T12:00:00Z");
let t: Awaited<ReturnType<typeof createTestDb>>;
let allNodes: (typeof nodes.$inferSelect)[];
let allEdges: (typeof edges.$inferSelect)[];
let items: (typeof profileItems.$inferSelect)[];
const byId = (id: string) => allNodes.find((n) => n.id === id)!;
const nameOf = (id: string) => byId(id).name;
const named = (name: string) => {
  const node = allNodes.find((n) => n.name === name && n.type !== "specialization");
  if (!node) throw new Error(`no node named ${name}`);
  return node;
};
const specOf = (role: string, spec: string) =>
  allNodes.find((n) => n.type === "specialization" && n.name === spec && n.parentRoleId === named(role).id)!;

beforeAll(async () => {
  t = await createTestDb();
  expect(await hasGraphData(t.db)).toBe(false);
  await seed(t.db, { today: TODAY });
  allNodes = await t.db.select().from(nodes);
  allEdges = await t.db.select().from(edges);
  items = await t.db.select().from(profileItems);
});
afterAll(async () => {
  await t.client.close();
});

/** Effective requirements by item name: the role's core plus the specialisation's own (its weight wins). */
function requirementsOf(role: string, spec?: string) {
  const result = new Map<string, Weight>();
  const add = (sourceId: string) => {
    for (const e of allEdges.filter((e) => e.kind === "requires" && e.sourceId === sourceId)) {
      result.set(nameOf(e.targetId), e.priority!);
    }
  };
  add(named(role).id);
  if (spec) add(specOf(role, spec).id);
  return result;
}
function grouped(requirements: Map<string, Weight>) {
  const result: Record<Weight, string[]> = { critical: [], important: [], nice: [] };
  for (const [name, w] of requirements) result[w].push(name);
  for (const list of Object.values(result)) list.sort();
  return result;
}
const itemsOf = (userId: string) =>
  new Set(items.filter((i) => i.userId === userId).map((i) => nameOf(i.nodeId)));
const sorted = (s: Iterable<string>) => [...s].sort();

describe("organisation", () => {
  it("has one site with the five practices, each role in one of them", async () => {
    expect(await t.db.select().from(sites)).toHaveLength(1);
    const ps = await t.db.select().from(practices);
    expect(ps.map((p) => p.name).sort()).toEqual([
      "Backend & Architecture",
      "Cloud & Security",
      "Data & AI",
      "Delivery Management",
      "Frontend Practice",
    ]);
    const roles = allNodes.filter((n) => n.type === "role");
    expect(roles.length).toBeGreaterThanOrEqual(18);
    for (const r of roles)
      expect(
        ps.map((p) => p.id),
        r.name,
      ).toContain(r.practiceId);
    expect(
      roles
        .filter((r) => r.practiceId === ps.find((p) => p.slug === "delivery")!.id)
        .map((r) => r.name)
        .sort(),
    ).toEqual(["Business Analyst", "Delivery Manager", "Product Owner", "Project Manager", "Scrum Master"]);
  });

  it("gives Frontend Developer and Scrum Master their specialisations, with scoped slugs", () => {
    const specs = allNodes.filter((n) => n.type === "specialization");
    expect(specs.map((s) => `${nameOf(s.parentRoleId!)}: ${s.name}`).sort()).toEqual([
      "Frontend Developer: Angular",
      "Frontend Developer: React",
      "Scrum Master: Facilitation / Management 3.0",
      "Scrum Master: SAFe",
    ]);
    for (const s of specs) expect(s.slug).toBe(specializationSlug(nameOf(s.parentRoleId!), s.name));
  });
});

describe("catalogue", () => {
  it("has technical skills (tools included), soft skills and certifications with issuers", () => {
    const of = (type: string) => allNodes.filter((n) => n.type === type);
    expect(of("technical_skill").length).toBeGreaterThanOrEqual(60);
    expect(of("soft_skill").length).toBeGreaterThanOrEqual(12);
    expect(of("certification").length).toBeGreaterThanOrEqual(12);
    for (const c of of("certification")) expect(c.issuer, c.name).toBeTruthy();
    for (const n of allNodes.filter((n) => n.type !== "certification")) expect(n.issuer, n.name).toBeNull();
    expect(named("Databricks")).toMatchObject({ type: "technical_skill", category: "Tool / platform" });
    expect(named("Problem Solving").type).toBe("soft_skill");
  });

  it("covers every example named in the brief and the reviews", () => {
    const examples: Record<string, string[]> = {
      role: [
        "Frontend Developer",
        "Data Engineer",
        "AI Engineer",
        "Project Manager",
        "Delivery Manager",
        "Business Analyst",
        "Solution Architect",
        "Security Engineer",
        "Scrum Master",
        "UX Developer",
      ],
      technical_skill: [
        "HTML & CSS",
        "JavaScript",
        "TypeScript",
        "React",
        "Python",
        "SQL",
        "Data Modelling",
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
        "Agile",
      ],
      soft_skill: [
        "Solutioning",
        "Team Leading",
        "Mentoring",
        "Leadership",
        "Stakeholder Management",
        "Problem Solving",
        "Account Management",
        "Commercial Awareness",
        "People Management",
      ],
      certification: ["Figma Foundation", "Professional Scrum Master I (PSM I)"],
    };
    for (const [type, names] of Object.entries(examples)) {
      for (const name of names) expect(named(name).type, name).toBe(type);
    }
  });

  it("gives every node a description, a category and the slug its name implies", () => {
    for (const n of allNodes) {
      expect(n.description.length, n.name).toBeGreaterThan(10);
      expect(n.category, n.name).toBeTruthy();
      if (n.type !== "specialization") expect(n.slug).toBe(slugify(n.name));
    }
  });

  it("leaves no catalogue item unconnected and gives every role a critical requirement", () => {
    const linked = new Set(allEdges.flatMap((e) => [e.sourceId, e.targetId]));
    for (const n of allNodes.filter((n) => !["role", "specialization"].includes(n.type))) {
      expect(linked.has(n.id), n.name).toBe(true);
    }
    for (const r of allNodes.filter((n) => n.type === "role")) {
      expect(grouped(requirementsOf(r.name)).critical.length, r.name).toBeGreaterThan(0);
    }
  });
});

describe("link rules", () => {
  it("connects the right node types for every kind of link", () => {
    const owner = new Set(["role", "specialization"]);
    for (const e of allEdges) {
      const [from, to] = [byId(e.sourceId).type, byId(e.targetId).type];
      const label = `${e.kind}: ${nameOf(e.sourceId)} → ${nameOf(e.targetId)}`;
      if (e.kind === "requires") expect(owner.has(from) && !owner.has(to), label).toBe(true);
      if (e.kind === "next_step") expect(owner.has(from) && owner.has(to), label).toBe(true);
      if (e.kind === "builds_on" || e.kind === "related_to")
        expect(owner.has(from) || owner.has(to), label).toBe(false);
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

  it("has the prerequisites the brief names, and descriptions on some official paths", () => {
    const has = (from: string, to: string) =>
      allEdges.some(
        (e) => e.kind === "builds_on" && e.sourceId === named(from).id && e.targetId === named(to).id,
      );
    expect(has("Databricks", "Python")).toBe(true);
    expect(has("Databricks", "Spark")).toBe(true);
    expect(has("Spark", "Python")).toBe(true);
    const pmToDm = allEdges.find(
      (e) =>
        e.kind === "next_step" &&
        e.sourceId === named("Project Manager").id &&
        e.targetId === named("Delivery Manager").id,
    );
    expect(pmToDm).toMatchObject({ typicalMonths: 24 });
    expect(pmToDm?.note).toBeTruthy();
  });
});

describe("requirements fixed by the scenarios", () => {
  it.each([
    [
      "Frontend Developer: React",
      () => requirementsOf("Frontend Developer", "React"),
      {
        critical: ["HTML & CSS", "JavaScript", "Problem Solving", "React", "TypeScript"],
        important: ["Accessibility", "Agile", "Git", "Testing"],
        nice: ["Figma Foundation", "GitHub Copilot", "Next.js"],
      },
    ],
    [
      "Data Engineer",
      () => requirementsOf("Data Engineer"),
      {
        critical: ["Data Modelling", "Problem Solving", "Python", "SQL"],
        important: ["Databricks", "Git", "Spark"],
        nice: ["Agile"],
      },
    ],
    [
      "Full-stack Developer",
      () => requirementsOf("Full-stack Developer"),
      {
        critical: ["JavaScript", "Problem Solving", "React", "TypeScript"],
        important: ["Agile", "Git", "Node.js", "REST APIs"],
        nice: ["SQL"],
      },
    ],
    [
      "Project Manager",
      () => requirementsOf("Project Manager"),
      {
        critical: ["Communication", "Planning & Scheduling", "Risk Management", "Stakeholder Management"],
        important: ["Agile", "Azure DevOps", "Facilitation"],
        nice: ["Change Management", "Estimation", "Jira", "Project Management Professional (PMP)"],
      },
    ],
    [
      "Delivery Manager",
      () => requirementsOf("Delivery Manager"),
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
  ])("%s", (_label, requirements, expected) => {
    expect(grouped(requirements())).toEqual(expected);
  });

  it("lets a specialisation raise a core requirement's weight", () => {
    expect(requirementsOf("Scrum Master").get("Facilitation")).toBe("important");
    expect(requirementsOf("Scrum Master", "Facilitation / Management 3.0").get("Facilitation")).toBe(
      "critical",
    );
    expect(requirementsOf("Scrum Master", "SAFe").get("Professional Scrum Master I (PSM I)")).toBe(
      "critical",
    );
  });

  // Until the domain functions arrive (M3) these use plain set operations on the seeded data.
  it("Scenario 1, role vs role: Frontend Developer: React → Data Engineer", () => {
    const from = requirementsOf("Frontend Developer", "React");
    const to = requirementsOf("Data Engineer");
    expect(sorted([...to.keys()].filter((s) => from.has(s)))).toEqual(["Agile", "Git", "Problem Solving"]);
    expect(sorted([...to.keys()].filter((s) => !from.has(s)))).toEqual([
      "Data Modelling",
      "Databricks",
      "Python",
      "SQL",
      "Spark",
    ]);
  });

  it("Scenario 1, person vs role: Alex → Data Engineer", () => {
    const has = itemsOf("seed-alex");
    const to = [...requirementsOf("Data Engineer").keys()];
    expect(sorted(to.filter((s) => has.has(s)))).toEqual(["Agile", "Git", "Problem Solving"]);
    expect(sorted(to.filter((s) => !has.has(s)))).toEqual([
      "Data Modelling",
      "Databricks",
      "Python",
      "SQL",
      "Spark",
    ]);
  });

  it("Scenario 2: Sam (Project Manager) → Delivery Manager misses exactly the five from the brief", () => {
    const has = itemsOf("seed-sam");
    const missing = [...requirementsOf("Delivery Manager").keys()].filter((s) => !has.has(s));
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
  it("seeds the Site Lead, a Practice Lead per practice and two managers with five reports each", async () => {
    const people = await t.db.select().from(user);
    expect(people.length).toBeGreaterThanOrEqual(16);
    for (const p of people) expect(p.email).toMatch(/@example\.com$/);
    expect((await t.db.select().from(siteLeads)).map((l) => l.userId)).toEqual(["seed-jordan"]);
    const leads = await t.db.select().from(practiceLeads);
    expect(new Set(leads.map((l) => l.practiceId)).size).toBe(5);
    const ps = await t.db.select().from(profiles);
    const reportsOf = (id: string) => ps.filter((p) => p.managerId === id);
    const frontend = (await t.db.select().from(practices)).find((p) => p.slug === "frontend")!.id;
    expect(reportsOf("seed-morgan")).toHaveLength(5);
    for (const r of reportsOf("seed-morgan")) expect(r.practiceId).toBe(frontend);
    expect(reportsOf("seed-riley")).toHaveLength(5);
    // the Site Lead's aggregates hide groups under 5: two practices are big enough
    const members = (practiceId: string) => ps.filter((p) => p.practiceId === practiceId).length;
    expect((await t.db.select().from(practices)).filter((p) => members(p.id) >= 5)).toHaveLength(2);
  });

  it("pre-fills profiles from the role and keeps certification dates", () => {
    expect(itemsOf("seed-alex")).toEqual(
      new Set(
        [...requirementsOf("Frontend Developer", "React").keys()].filter((n) => n !== "Figma Foundation"),
      ),
    );
    expect(itemsOf("seed-noah").has("Testing")).toBe(false);
    const cert = (userId: string, name: string) =>
      items.find((i) => i.userId === userId && i.nodeId === named(name).id)!;
    expect(cert("seed-omar", "SAFe Scrum Master (SSM)").expiresOn).toBe("2026-11-14"); // expiring within 90 days
    expect(cert("seed-ella", "Power BI Data Analyst (PL-300)").expiresOn).toBe("2026-08-01"); // expired
    expect(cert("seed-jamie", "Azure Fundamentals (AZ-900)").expiresOn).toBeNull(); // doesn't expire
  });

  it("seeds recommendations and change requests in every state, with valid operations", async () => {
    const recs = await t.db.select().from(recommendations);
    expect(sorted(recs.map((r) => r.status))).toEqual(["accepted", "accepted", "open", "open"]);
    const ben = (await t.db.select().from(profiles)).find((p) => p.userId === "seed-ben")!;
    expect(nameOf(ben.targetSpecializationId!)).toBe("Facilitation / Management 3.0");

    const requests = await t.db.select().from(changeRequests);
    expect(sorted(requests.map((r) => r.status))).toEqual(["approved", "needs_info", "open", "rejected"]);
    for (const r of requests) {
      expect(() => changesSchema.parse(r.changes), r.reason).not.toThrow();
      if (r.status === "approved" || r.status === "rejected") expect(r.decidedBy).toBeTruthy();
    }
    expect(await t.db.select().from(changeRequestComments)).toHaveLength(1);
  });
});

describe("re-running", () => {
  it("adds nothing the second time and keeps the counts", async () => {
    const counts = async () => ({
      nodes: (await t.db.select({ n: count() }).from(nodes))[0].n,
      edges: (await t.db.select({ n: count() }).from(edges))[0].n,
      people: (await t.db.select({ n: count() }).from(user))[0].n,
      items: (await t.db.select({ n: count() }).from(profileItems))[0].n,
      comments: (await t.db.select({ n: count() }).from(changeRequestComments))[0].n,
    });
    const before = await counts();
    expect(await seed(t.db, { today: TODAY })).toEqual({ nodes: 0, links: 0, people: 0 });
    expect(await counts()).toEqual(before);
    expect(await hasGraphData(t.db)).toBe(true);
  });

  it("seeds the site, practices and graph without demo data (production)", async () => {
    const fresh = await createTestDb();
    const added = await seed(fresh.db, { demo: false, today: TODAY });
    expect(added).toEqual({ nodes: allNodes.length, links: allEdges.length, people: 0 });
    expect(await fresh.db.select().from(practices)).toHaveLength(5);
    for (const table of [user, profiles, recommendations, changeRequests]) {
      expect(await fresh.db.select().from(table)).toHaveLength(0);
    }
    await fresh.client.close();
  });
});
