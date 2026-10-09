import { describe, expect, it } from "vitest";
import { normalizeName, slugify } from "./names";

describe("normalizeName", () => {
  it.each([
    ["  Power   BI ", "power bi"],
    ["HTML & CSS", "html and css"],
    ["HTML and CSS", "html and css"],
    ["Node.js", "node js"],
    ["CI/CD", "ci cd"],
    ["Café Ops", "cafe ops"],
  ])("%j → %j", (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });

  it("keeps C# and C++ apart from C", () => {
    expect(new Set(["C", "C#", "C++"].map(normalizeName)).size).toBe(3);
  });
});

describe("slugify", () => {
  it.each([
    ["C#", "csharp"],
    ["C++", "cplusplus"],
    ["HTML & CSS", "html-and-css"],
    [".NET", "net"],
    ["Retrieval-Augmented Generation", "retrieval-augmented-generation"],
  ])("%j → %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});
