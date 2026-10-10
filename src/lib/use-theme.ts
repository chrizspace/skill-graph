"use client";

import { useSyncExternalStore } from "react";
import { defaultTheme, isThemeName, THEME_STORAGE_KEY } from "@/design-system/theme";
import type { ThemeName } from "@/design-system/tokens";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  // another tab chose a theme: follow it
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY && isThemeName(e.newValue)) {
      document.documentElement.setAttribute("data-theme", e.newValue);
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// the theme in use is the one on <html>, which the inline script in the root layout set before painting
const getSnapshot = (): ThemeName => {
  const current = document.documentElement.getAttribute("data-theme");
  return isThemeName(current) ? current : defaultTheme;
};
const getServerSnapshot = (): ThemeName => defaultTheme;

/** Puts a theme on the page and remembers it in this browser (it also lets the next page load skip a flash). */
export function applyTheme(next: ThemeName) {
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // storage blocked (private window): the choice lasts until the page is closed
  }
  notify();
}

/** The theme in use and a function to change it in this browser. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { theme, setTheme: applyTheme };
}
