import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { componentCatalogue, docsId } from "./catalogue";

const componentFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const path = join(dir, f);
    if (statSync(path).isDirectory()) return componentFiles(path);
    return path.endsWith(".tsx") && !path.endsWith(".stories.tsx") ? [path] : [];
  });

describe("component catalogue (Storybook overview)", () => {
  const files = componentFiles("src/components");

  it.each(files)("%s has a story and is listed in the catalogue", (file) => {
    const story = file.replace(/\.tsx$/, ".stories.tsx");
    expect(existsSync(story), `add ${story}`).toBe(true);
    const entry = componentCatalogue.find((e) => e.file === file);
    expect(entry, `list ${file} in src/design-system/catalogue.ts`).toBeDefined();
    expect(readFileSync(story, "utf8")).toContain(`title: "${entry!.group}/${entry!.name}"`);
  });

  it("lists only files that exist, once each", () => {
    for (const e of componentCatalogue) expect(existsSync(e.file), e.file).toBe(true);
    expect(new Set(componentCatalogue.map((e) => e.file)).size).toBe(componentCatalogue.length);
  });

  it("derives Storybook docs ids from the title", () => {
    expect(docsId({ group: "UI", name: "Toggle group" })).toBe("ui-toggle-group--docs");
  });
});
