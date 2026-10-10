import { defaultTheme, themeNames, type ThemeName } from "./tokens";

/** Where a person's choice is kept: in their browser (it is a preference of the device, not of the account). */
export const THEME_STORAGE_KEY = "skill-graph-theme";

export const isThemeName = (value: unknown): value is ThemeName =>
  (themeNames as readonly unknown[]).includes(value);

/**
 * Runs in <head>, before the first paint, so a saved theme never flashes the default one. Plain ES5 on purpose: it is
 * inlined as a string. Anything unknown or an unavailable `localStorage` leaves the default theme in place.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(${JSON.stringify(themeNames)}.indexOf(t)>-1)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export { defaultTheme };
