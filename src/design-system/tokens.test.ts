import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { contrastPairs, primitives, semanticTokenNames, themeNames, themes } from "./tokens";

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1);
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });
});

describe.each(themeNames)("%s theme", (theme) => {
  const tokens = themes[theme];

  it("defines every semantic token as a hex colour", () => {
    for (const name of semanticTokenNames) expect(tokens[name], name).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each(contrastPairs)("%s on %s meets %d:1", (fg, bg, min) => {
    expect(contrastRatio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(min);
  });
});

describe("Orange theme", () => {
  it("is anchored on the brand orange, with near-black ink on it", () => {
    expect(themes.orange.primary).toBe("#ff5800");
    expect(themes.orange["primary-foreground"]).toBe("#1a1a1a");
    expect(themes.orange.foreground).toBe("#333333");
  });
});

describe("Violet theme", () => {
  it("is anchored on the core purple, with white text on it", () => {
    expect(themes.violet.primary).toBe("#a100ff");
    expect(themes.violet["primary-foreground"]).toBe("#ffffff");
  });
  it("uses the palette's tint, mid and deep purples", () => {
    expect(primitives.violet[50]).toBe("#f5e5ff");
    expect(primitives.violet[700]).toBe("#7500c0");
    expect(primitives.violet[900]).toBe("#460073");
    expect(themes.violet.accent).toBe("#f5e5ff");
    expect(themes.violet.link).toBe("#7500c0");
  });
});

describe("tokens.css", () => {
  it("is up to date with tokens.ts (run `pnpm tokens` after changing tokens)", async () => {
    const { readFileSync } = await import("node:fs");
    const { renderTokensCss } = await import("./render-css");
    expect(readFileSync("src/design-system/tokens.css", "utf8")).toBe(renderTokensCss());
  });
});
