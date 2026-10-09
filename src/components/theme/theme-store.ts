"use client";

import { useSyncExternalStore } from "react";
import {
  applyPreferences,
  defaultPreferences,
  readPreferences,
  storageKeys,
  type ModePreference,
  type Preferences,
} from "@/design-system/theme";
import type { ThemeName } from "@/design-system/tokens";

const listeners = new Set<() => void>();
let current: Preferences | null = null;

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};
const prefersDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

function snapshot() {
  current ??= readPreferences(storage());
  return current;
}

function update(next: Partial<Preferences>) {
  current = { ...snapshot(), ...next };
  try {
    storage()?.setItem(storageKeys.theme, current.theme);
    storage()?.setItem(storageKeys.mode, current.mode);
  } catch {
    // not persisted, still applied
  }
  applyPreferences(document.documentElement, current, prefersDark());
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // follow the system setting while the mode is "system"
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  const onSystem = () => applyPreferences(document.documentElement, snapshot(), prefersDark());
  media?.addEventListener("change", onSystem);
  return () => {
    listeners.delete(listener);
    media?.removeEventListener("change", onSystem);
  };
}

/** The current theme and mode, and setters that persist and apply them. */
export function useThemePreferences() {
  const prefs = useSyncExternalStore(subscribe, snapshot, () => defaultPreferences);
  return {
    ...prefs,
    setTheme: (theme: ThemeName) => update({ theme }),
    setMode: (mode: ModePreference) => update({ mode }),
  };
}

/** For Storybook: set the preferences from outside React. */
export const setThemePreferences = update;
