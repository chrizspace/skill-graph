import { describe, expect, it } from "vitest";
import { hrefWith, param } from "./query";

describe("param", () => {
  it("takes the first value, trimmed, and nothing for empty", () => {
    expect(param(" a ")).toBe("a");
    expect(param(["x", "y"])).toBe("x");
    expect(param("  ")).toBeUndefined();
    expect(param(undefined)).toBeUndefined();
  });
});

describe("hrefWith", () => {
  it("keeps the other params and overrides one", () => {
    expect(hrefWith("/roles", { q: "scrum", practice: "delivery" }, { practice: "frontend" })).toBe(
      "/roles?q=scrum&practice=frontend",
    );
  });
  it("removes a param set to undefined, and the ? when none are left", () => {
    expect(hrefWith("/roles", { practice: "delivery" }, { practice: undefined })).toBe("/roles");
  });
});
