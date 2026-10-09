/**
 * Theme (Orange / Violet) and mode (light / dark / system) preferences, kept in localStorage and applied to <html>
 * as `data-theme` and the `dark` class. Framework-free so the inline script, the switcher and Storybook share it.
 */
import { themeNames, type ThemeName } from "./tokens";

export const modePreferences = ["light", "dark", "system"] as const;
export type ModePreference = (typeof modePreferences)[number];
export type Preferences = { theme: ThemeName; mode: ModePreference };

export const storageKeys = { theme: "skill-graph:theme", mode: "skill-graph:mode" } as const;
export const defaultPreferences: Preferences = { theme: "orange", mode: "system" };

const isTheme = (v: unknown): v is ThemeName => (themeNames as readonly unknown[]).includes(v);
const isMode = (v: unknown): v is ModePreference => (modePreferences as readonly unknown[]).includes(v);

export function resolveMode(mode: ModePreference, prefersDark: boolean): "light" | "dark" {
  return mode === "system" ? (prefersDark ? "dark" : "light") : mode;
}

export function applyPreferences(root: HTMLElement, prefs: Preferences, prefersDark: boolean) {
  const mode = resolveMode(prefs.mode, prefersDark);
  root.dataset.theme = prefs.theme;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
}

export function readPreferences(storage: Pick<Storage, "getItem"> | null): Preferences {
  try {
    const theme = storage?.getItem(storageKeys.theme);
    const mode = storage?.getItem(storageKeys.mode);
    return {
      theme: isTheme(theme) ? theme : defaultPreferences.theme,
      mode: isMode(mode) ? mode : defaultPreferences.mode,
    };
  } catch {
    return defaultPreferences; // storage can be blocked (private windows, embeds)
  }
}

/** Runs in <head> before the first paint, so the page never flashes the wrong theme. */
export const themeInitScript = `(function(){try{var d=document.documentElement,s=localStorage,t=s.getItem(${JSON.stringify(
  storageKeys.theme,
)}),m=s.getItem(${JSON.stringify(storageKeys.mode)});if(${JSON.stringify(themeNames)}.indexOf(t)<0)t=${JSON.stringify(
  defaultPreferences.theme,
)};if(["light","dark","system"].indexOf(m)<0)m=${JSON.stringify(
  defaultPreferences.mode,
)};var dark=m==="dark"||(m==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);d.dataset.theme=t;d.classList.toggle("dark",dark);d.style.colorScheme=dark?"dark":"light"}catch(e){}})();`;
