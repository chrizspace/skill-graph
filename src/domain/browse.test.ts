import { describe, expect, it } from "vitest";
import {
  browseCatalogue,
  browseRoles,
  catalogueCategories,
  itemDetail,
  roleDetail,
  targetChoices,
} from "./browse";
import { seedGraph } from "./testing/seed-graph";

const graph = seedGraph();
const names = (rows: { name: string }[]) => rows.map((r) => r.name);

describe("browseRoles", () => {
  it("lists every published role by name", () => {
    const all = browseRoles(graph).map((r) => r.role.name);
    expect(all).toHaveLength(19);
    expect(all).toEqual([...all].sort((a, b) => a.localeCompare(b)));
  });
  it("filters by practice", () => {
    expect(browseRoles(graph, { practiceId: "data-ai" }).map((r) => r.role.name)).toEqual([
      "AI Engineer",
      "Analytics Engineer",
      "Data Analyst",
      "Data Engineer",
      "Data Scientist",
    ]);
  });
  it("searches names, ignoring case and punctuation", () => {
    expect(browseRoles(graph, { query: "scrum" }).map((r) => r.role.name)).toEqual(["Scrum Master"]);
    expect(browseRoles(graph, { query: "DATA  engineer" }).map((r) => r.role.name)).toEqual([
      "Data Engineer",
    ]);
  });
  it("finds a role by one of its specialisations", () => {
    expect(browseRoles(graph, { query: "angular" }).map((r) => r.role.name)).toEqual(["Frontend Developer"]);
  });
  it("counts core requirements by weight", () => {
    const de = browseRoles(graph, { query: "Data Engineer" }).find((r) => r.role.name === "Data Engineer")!;
    expect(de.coreCounts).toEqual({ critical: 4, important: 3, nice: 1 });
    expect(de.specializations).toEqual([]);
  });
  it("combines a query with a practice", () => {
    expect(browseRoles(graph, { query: "manager", practiceId: "delivery" }).map((r) => r.role.name)).toEqual([
      "Delivery Manager",
      "Project Manager",
    ]);
  });
});

describe("browseCatalogue", () => {
  it("filters by type, category and search", () => {
    const certs = browseCatalogue(graph, { type: "certification" });
    expect(certs).toHaveLength(17);
    expect(browseCatalogue(graph, { type: "soft_skill" })).toHaveLength(15);
    const tools = browseCatalogue(graph, { category: "Tool / platform" });
    expect(tools.length).toBeGreaterThan(5);
    expect(tools.every((e) => e.item.type === "technical_skill")).toBe(true);
    expect(names(browseCatalogue(graph, { query: "databricks" }).map((e) => e.item))).toContain("Databricks");
  });
  it("counts the roles that need an item, and the critical ones", () => {
    const sql = browseCatalogue(graph, { query: "sql" }).find((e) => e.item.name === "SQL")!;
    expect(sql.neededBy).toBeGreaterThan(1);
    expect(sql.critical).toBeGreaterThanOrEqual(1);
  });
  it("lists categories, per type if asked", () => {
    expect(catalogueCategories(graph)).toContain("Tool / platform");
    expect(catalogueCategories(graph, "soft_skill")).not.toContain("Tool / platform");
  });
});

describe("roleDetail", () => {
  it("returns null for an unknown slug and for an item", () => {
    expect(roleDetail(graph, "nope")).toBeNull();
    expect(roleDetail(graph, "sql")).toBeNull();
  });

  it("Scenario 9: the Scrum Master page", () => {
    const sm = roleDetail(graph, "scrum-master")!;
    expect(names(sm.coreByWeight.critical.map((r) => r.item))).toEqual([
      "Agile",
      "Coaching",
      "Communication",
      "Professional Scrum Master I (PSM I)",
      "Scrum",
    ]);
    expect(sm.coreByType.certification.map((r) => r.item.name)).toEqual([
      "Professional Scrum Master I (PSM I)",
    ]);
    expect(sm.specializations.map((s) => s.specialization.name)).toEqual([
      "Facilitation / Management 3.0",
      "SAFe",
    ]);

    const safe = sm.specializations.find((s) => s.specialization.name === "SAFe")!;
    expect(safe.adds.map((r) => `${r.item.name}:${r.weight}`)).toEqual(
      expect.arrayContaining(["SAFe:critical", "PI Planning:important"]),
    );
    expect(safe.raises).toEqual([]);

    const m30 = sm.specializations.find((s) => s.specialization.name.startsWith("Facilitation"))!;
    expect(m30.raises).toEqual([
      { item: expect.objectContaining({ name: "Facilitation" }), from: "important", to: "critical" },
    ]);

    const similar = sm.similar.map((s) => s.role.name);
    expect(similar).toEqual(expect.arrayContaining(["Project Manager", "Product Owner"]));
    const pm = sm.similar.find((s) => s.role.name === "Project Manager")!;
    expect(pm.shared.map((s) => s.item.name)).toEqual(
      expect.arrayContaining(["Agile", "Facilitation", "Stakeholder Management", "Communication"]),
    );
  });

  it("shows official paths out and in, with where they start", () => {
    const fe = roleDetail(graph, "frontend-developer")!;
    expect(fe.pathsOut.length + fe.pathsIn.length).toBeGreaterThan(0);
    const de = roleDetail(graph, "data-engineer")!;
    expect(de.pathsOut.map((p) => p.other.label)).toEqual(
      expect.arrayContaining(["AI Engineer", "Solution Architect"]),
    );
    expect(de.pathsOut.every((p) => p.via === null)).toBe(true);
    for (const p of [...fe.pathsOut, ...fe.pathsIn]) expect(p.other.slug).toBeTruthy();
  });

  it("a role without specialisations has none", () => {
    expect(roleDetail(graph, "data-engineer")!.specializations).toEqual([]);
  });
});

describe("itemDetail", () => {
  it("returns null for an unknown slug and for a role", () => {
    expect(itemDetail(graph, "nope")).toBeNull();
    expect(itemDetail(graph, "data-engineer")).toBeNull();
  });
  it("lists the roles that need it by weight, with specialisations labelled", () => {
    const react = itemDetail(graph, "react")!;
    expect(react.usedBy.critical.map((u) => u.label)).toContain("Frontend Developer: React");
    expect(react.usedBy.critical.find((u) => u.label === "Frontend Developer: React")!.roleSlug).toBe(
      "frontend-developer",
    );
    expect(react.usedByCount).toBe(
      react.usedBy.critical.length + react.usedBy.important.length + react.usedBy.nice.length,
    );
  });
  it("shows what it builds on and what builds on it", () => {
    const databricks = itemDetail(graph, "databricks")!;
    expect(names(databricks.buildsOn)).toEqual(["Python", "Spark"]);
    expect(names(itemDetail(graph, "spark")!.requiredFor)).toContain("Databricks");
  });
  it("lists related items from either side", () => {
    const pairs = itemDetail(graph, "terraform")!.related;
    expect(pairs.map((n) => n.name)).toContain("Bicep");
    expect(names(itemDetail(graph, "bicep")!.related)).toContain("Terraform");
  });
});

describe("targetChoices", () => {
  it("groups roles and their specialisations by practice, in name order", () => {
    const groups = targetChoices(graph);
    expect(groups).toHaveLength(5);
    const frontend = groups.find((g) => g.practiceId === "frontend")!;
    expect(frontend.options.map((o) => o.label)).toEqual([
      "Frontend Developer",
      "Frontend Developer: Angular",
      "Frontend Developer: React",
      "Full-stack Developer",
      "UX Developer",
    ]);
    expect(frontend.options[2].slug).toBe("frontend-developer--react");
  });
});
