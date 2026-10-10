import { describe, expect, it } from "vitest";
import type { Actor } from "./access";
import {
  canEditNode,
  catalogueItem,
  checkNewItem,
  checkNewRole,
  checkNewSpecialization,
  checkText,
  freeSlug,
  isEmergencyEdit,
  practiceIdOf,
  roleLike,
  roleSlug,
  specSlug,
} from "./editing";
import { seedGraph } from "./testing/seed-graph";

const graph = seedGraph();
const base: Actor = {
  userId: "u",
  name: "N",
  email: "n@example.com",
  practiceId: null,
  reportCount: 0,
  leadOf: [],
  siteLead: false,
};
const frontendLead: Actor = {
  ...base,
  leadOf: [{ id: "frontend", slug: "frontend", name: "Frontend Practice" }],
};
const siteLead: Actor = { ...base, siteLead: true };

describe("practiceIdOf / canEditNode", () => {
  it("a role's practice, a specialisation's is its role's, an item has none", () => {
    expect(practiceIdOf(graph, "Frontend Developer")).toBe("frontend");
    expect(practiceIdOf(graph, "Frontend Developer: React")).toBe("frontend");
    expect(practiceIdOf(graph, "SQL")).toBeNull();
    expect(practiceIdOf(graph, "nope")).toBeNull();
  });
  it("a Practice Lead edits only their own practice's roles and specialisations", () => {
    expect(canEditNode(frontendLead, graph, "Frontend Developer")).toBe(true);
    expect(canEditNode(frontendLead, graph, "Frontend Developer: React")).toBe(true);
    expect(canEditNode(frontendLead, graph, "Scrum Master")).toBe(false);
    expect(canEditNode(frontendLead, graph, "SQL")).toBe(false);
  });
  it("the Site Lead may edit any role; others none", () => {
    expect(canEditNode(siteLead, graph, "Scrum Master")).toBe(true);
    expect(canEditNode(base, graph, "Frontend Developer")).toBe(false);
  });
  it("an edit by the Site Lead in a practice they don't lead is an emergency edit", () => {
    expect(isEmergencyEdit(siteLead, "frontend")).toBe(true);
    expect(isEmergencyEdit({ ...siteLead, leadOf: frontendLead.leadOf }, "frontend")).toBe(false);
    expect(isEmergencyEdit(frontendLead, "frontend")).toBe(false);
  });
});

describe("slugs", () => {
  it("uses the name, then numbers a clash", () => {
    expect(roleSlug(graph, "Quantum Engineer")).toBe("quantum-engineer");
    expect(roleSlug(graph, "Scrum Master")).toBe("scrum-master-2");
    expect(freeSlug(graph, "data-engineer")).toBe("data-engineer-2");
    expect(specSlug(graph, "Frontend Developer", "Svelte")).toBe("frontend-developer--svelte");
    expect(specSlug(graph, "Frontend Developer", "React")).toBe("frontend-developer--react-2");
  });
});

describe("input checks", () => {
  it("a role needs a name and a description, and a name nobody else has", () => {
    expect(checkNewRole(graph, "Quantum Engineer", "Builds things.")).toEqual([]);
    expect(checkNewRole(graph, " ", "x")).toContain("A name is required.");
    expect(checkNewRole(graph, "Quantum Engineer", " ")).toContain("Describe what the role does.");
    expect(checkNewRole(graph, "scrum master", "x").join()).toContain("already exists");
    expect(checkNewRole(graph, "SQL", "x").join()).toContain("already exists"); // roles and skills share names
    expect(checkNewRole(graph, "x".repeat(121), "x").join()).toContain("at most 120");
  });
  it("a specialisation's name only has to be free within its role", () => {
    const role = graph.nodes.get("Frontend Developer")!;
    expect(checkNewSpecialization(graph, role, "Svelte", "Svelte apps.")).toEqual([]);
    expect(checkNewSpecialization(graph, role, "react", "x").join()).toContain("already has");
    expect(checkNewSpecialization(graph, graph.nodes.get("SQL")!, "x", "x").join()).toContain(
      "belong to a role",
    );
    const scrum = graph.nodes.get("Scrum Master")!;
    expect(checkNewSpecialization(graph, scrum, "React", "x")).toEqual([]); // "React" is a skill too, but not a role
  });
  it("a catalogue item is blocked by a normalised-name duplicate, and only certifications have issuers", () => {
    expect(checkNewItem(graph, { type: "technical_skill", name: "Rust" })).toEqual([]);
    expect(checkNewItem(graph, { type: "technical_skill", name: "  python " }).join()).toContain(
      "already exists",
    );
    expect(checkNewItem(graph, { type: "technical_skill", name: "HTML and CSS" }).join()).toContain(
      "already exists",
    );
    expect(
      checkNewItem(graph, { type: "technical_skill", name: "Rust", issuer: "Mozilla" }).join(),
    ).toContain("issuer");
    expect(checkNewItem(graph, { type: "certification", name: "Rust Cert", issuer: "Mozilla" })).toEqual([]);
    expect(checkNewItem(graph, { type: "role", name: "Rust" }).join()).toContain("Choose");
  });
  it("checkText limits length", () => {
    expect(checkText("ok", "y".repeat(2001)).join()).toContain("at most 2000");
  });
});

describe("lookups", () => {
  it("finds roles, specialisations and published items", () => {
    expect(roleLike(graph, "Data Engineer")?.name).toBe("Data Engineer");
    expect(roleLike(graph, "SQL")).toBeNull();
    expect(catalogueItem(graph, "SQL")?.name).toBe("SQL");
    expect(catalogueItem(graph, "Data Engineer")).toBeNull();
  });
});
