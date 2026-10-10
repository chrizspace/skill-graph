import { describe, expect, it } from "vitest";
import { parseCertification, skillIds, slugOfTarget, targetBySlug, validTarget } from "./profile-input";
import { seedGraph, target } from "./testing/seed-graph";

const graph = seedGraph();
const PSM = "Professional Scrum Master I (PSM I)";

describe("targetBySlug / slugOfTarget", () => {
  it("resolves a role and a specialisation (scoped slug)", () => {
    expect(targetBySlug(graph, "data-engineer")).toEqual({ roleId: "Data Engineer", specializationId: null });
    expect(targetBySlug(graph, "frontend-developer--react")).toEqual({
      roleId: "Frontend Developer",
      specializationId: "Frontend Developer: React",
    });
  });
  it("is null for items and unknown slugs", () => {
    expect(targetBySlug(graph, "sql")).toBeNull();
    expect(targetBySlug(graph, "nope")).toBeNull();
  });
  it("round-trips", () => {
    for (const t of [target("Data Engineer"), target("Frontend Developer", "React")]) {
      expect(targetBySlug(graph, slugOfTarget(graph, t))).toEqual({ specializationId: null, ...t });
    }
  });
});

describe("validTarget", () => {
  it("accepts a role and one of its own specialisations", () => {
    expect(validTarget(graph, "Frontend Developer", "Frontend Developer: React")).toEqual(
      target("Frontend Developer", "React"),
    );
    expect(validTarget(graph, "Data Engineer")).toEqual({ roleId: "Data Engineer", specializationId: null });
  });
  it("rejects a skill, a stranger's specialisation and unknown ids", () => {
    expect(validTarget(graph, "SQL")).toBeNull();
    expect(validTarget(graph, "Data Engineer", "Frontend Developer: React")).toBeNull();
    expect(validTarget(graph, "nope")).toBeNull();
  });
});

describe("skillIds", () => {
  it("keeps technical and soft skills once, drops everything else", () => {
    expect(skillIds(graph, ["SQL", "SQL", "Communication", PSM, "Data Engineer", "nope"])).toEqual([
      "SQL",
      "Communication",
    ]);
  });
});

describe("parseCertification", () => {
  it("accepts dates in any combination that makes sense", () => {
    expect(parseCertification(graph, { nodeId: PSM })).toEqual({
      ok: true,
      value: { nodeId: PSM, obtainedOn: null, expiresOn: null },
    });
    expect(
      parseCertification(graph, { nodeId: PSM, obtainedOn: "2025-01-31", expiresOn: "2027-01-31" }),
    ).toEqual({
      ok: true,
      value: { nodeId: PSM, obtainedOn: "2025-01-31", expiresOn: "2027-01-31" },
    });
    expect(parseCertification(graph, { nodeId: PSM, obtainedOn: "", expiresOn: "" }).ok).toBe(true);
  });
  it("rejects anything but a certification", () => {
    expect(parseCertification(graph, { nodeId: "SQL" })).toMatchObject({ ok: false });
    expect(parseCertification(graph, { nodeId: "nope" })).toMatchObject({ ok: false });
  });
  it("rejects impossible dates and an expiry before the date obtained", () => {
    expect(parseCertification(graph, { nodeId: PSM, obtainedOn: "2025-02-30" })).toMatchObject({ ok: false });
    expect(parseCertification(graph, { nodeId: PSM, expiresOn: "tomorrow" })).toMatchObject({ ok: false });
    expect(
      parseCertification(graph, { nodeId: PSM, obtainedOn: "2025-06-01", expiresOn: "2025-05-31" }),
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining("before"),
    });
  });
});
