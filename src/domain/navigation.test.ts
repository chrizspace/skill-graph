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
  it("gives everyone Explore and Me", () => {
    expect(labels(base)).toEqual(["Explore", "Me"]);
  });
  it("adds Team and Requests for a manager", () => {
    expect(labels({ ...base, reportCount: 3 })).toEqual(["Explore", "Me", "Team", "Requests"]);
  });
  it("adds a link per led practice for a Practice Lead", () => {
    const groups = navigationFor({
      ...base,
      leadOf: [
        { id: "1", slug: "frontend", name: "Frontend Practice" },
        { id: "2", slug: "data-ai", name: "Data & AI" },
      ],
    });
    expect(groups.map((g) => g.label)).toEqual(["Explore", "Me", "Practice", "Requests"]);
    expect(groups[2].items.map((i) => i.href)).toEqual(["/practices/frontend", "/practices/data-ai"]);
  });
  it("adds Requests and Site for the Site Lead, who can step in", () => {
    expect(labels({ ...base, siteLead: true })).toEqual(["Explore", "Me", "Requests", "Site"]);
  });
  it("adds up for someone who is all of them", () => {
    const all = { ...base, reportCount: 1, siteLead: true, leadOf: [{ id: "1", slug: "a", name: "A" }] };
    expect(labels(all)).toEqual(["Explore", "Me", "Team", "Practice", "Requests", "Site"]);
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
