import { describe, expect, it } from "vitest";
import type { Actor } from "./access";
import { activeHref, navigationFor } from "./navigation";

const base: Actor = {
  userId: "u",
  name: "N",
  email: "n@example.com",
  practiceId: null,
  reportCount: 0,
  leadOf: [],
  siteLead: false,
};
const labels = (actor: Actor) => navigationFor(actor).map((g) => g.label);

describe("navigation per user type", () => {
  it("gives everyone My Skills and Explore Skills", () => {
    expect(labels(base)).toEqual(["My Skills", "Explore Skills"]);
  });
  it("adds Manage Team, and Change requests under Explore Skills, for a manager", () => {
    const groups = navigationFor({ ...base, reportCount: 3 });
    expect(groups.map((g) => g.label)).toEqual(["My Skills", "Explore Skills", "Manage Team"]);
    expect(groups[1].items.at(-1)).toEqual({ label: "Change requests", href: "/requests" });
  });
  it("adds a link per led practice for a Practice Lead", () => {
    const groups = navigationFor({
      ...base,
      leadOf: [
        { id: "1", slug: "frontend", name: "Frontend Practice" },
        { id: "2", slug: "data-ai", name: "Data & AI" },
      ],
    });
    expect(groups.map((g) => g.label)).toEqual(["My Skills", "Explore Skills", "Lead Practice"]);
    expect(groups[2].items.map((i) => i.href)).toEqual(["/practices/frontend", "/practices/data-ai"]);
  });
  it("adds Organize Site, and Change requests, for the Site Lead, who can step in", () => {
    expect(labels({ ...base, siteLead: true })).toEqual(["My Skills", "Explore Skills", "Organize Site"]);
  });
  it("gives an employee no Change requests link", () => {
    expect(navigationFor(base)[1].items.map((i) => i.href)).not.toContain("/requests");
  });
  it("adds up for someone who is all of them", () => {
    const all = { ...base, reportCount: 1, siteLead: true, leadOf: [{ id: "1", slug: "a", name: "A" }] };
    expect(labels(all)).toEqual([
      "My Skills",
      "Explore Skills",
      "Manage Team",
      "Lead Practice",
      "Organize Site",
    ]);
  });
});

describe("activeHref", () => {
  const groups = navigationFor({ ...base, reportCount: 1 });
  it("matches the longest prefix", () => {
    expect(activeHref(groups, "/team/succession")).toBe("/team/succession");
    expect(activeHref(groups, "/team/abc")).toBe("/team");
    expect(activeHref(groups, "/me/plan")).toBe("/me/plan");
  });
  it("matches Home only on /", () => {
    expect(activeHref(groups, "/")).toBe("/");
    expect(activeHref(groups, "/nowhere")).toBeNull();
  });
});
