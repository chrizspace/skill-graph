import { describe, expect, it } from "vitest";
import { applyPreferences, readPreferences, resolveMode, storageKeys, themeInitScript } from "./theme";

const storage = (values: Record<string, string>) => ({ getItem: (k: string) => values[k] ?? null });

describe("theme preferences", () => {
  it("reads stored values and falls back to Orange / system", () => {
    expect(readPreferences(storage({ [storageKeys.theme]: "violet", [storageKeys.mode]: "dark" }))).toEqual({
      theme: "violet",
      mode: "dark",
    });
    expect(readPreferences(storage({ [storageKeys.theme]: "pink", [storageKeys.mode]: "dim" }))).toEqual({
      theme: "orange",
      mode: "system",
    });
    expect(readPreferences(null)).toEqual({ theme: "orange", mode: "system" });
    expect(
      readPreferences({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toEqual({ theme: "orange", mode: "system" });
  });

  it("resolves system mode from the OS setting", () => {
    expect(resolveMode("system", true)).toBe("dark");
    expect(resolveMode("system", false)).toBe("light");
    expect(resolveMode("light", true)).toBe("light");
  });

  it("applies the theme and mode to the root element", () => {
    const classes = new Set<string>();
    const root = {
      dataset: {} as Record<string, string>,
      classList: { toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)) },
      style: {} as Record<string, string>,
    } as unknown as HTMLElement;
    applyPreferences(root, { theme: "violet", mode: "system" }, true);
    expect(root.dataset.theme).toBe("violet");
    expect(classes.has("dark")).toBe(true);
    applyPreferences(root, { theme: "orange", mode: "light" }, true);
    expect(classes.has("dark")).toBe(false);
    expect(root.style.colorScheme).toBe("light");
  });

  it("ships an init script that uses the same storage keys", () => {
    expect(themeInitScript).toContain(storageKeys.theme);
    expect(themeInitScript).toContain(storageKeys.mode);
    expect(() => new Function(themeInitScript)).not.toThrow();
  });
});
