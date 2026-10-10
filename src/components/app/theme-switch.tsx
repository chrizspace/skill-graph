"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { isThemeName } from "@/design-system/theme";
import { themeLabels, themeNames, themes, type ThemeName } from "@/design-system/tokens";
import { applyTheme, useTheme } from "@/lib/use-theme";
import { cn } from "@/lib/utils";

/** A dot in the theme's own colour, so the choice can be seen as well as read. */
const Swatch = ({ theme }: { theme: ThemeName }) => (
  <span
    aria-hidden
    className="inline-block size-3.5 shrink-0 rounded-full border"
    style={{ background: themes[theme].primary }}
  />
);

/**
 * Puts the theme saved on the signed-in person's profile on the page, e.g. on a device they haven't used before.
 * Renders nothing. A person without a saved theme keeps whatever this browser has.
 */
export function ThemeSync({ theme }: { theme: string | null }) {
  useEffect(() => {
    if (isThemeName(theme)) applyTheme(theme);
  }, [theme]);
  return null;
}

/**
 * The theme choice as radio buttons, on the profile page. It applies at once; `onSave` stores the choice on the
 * profile (a server action), so it follows the person to other browsers.
 */
export function ThemeRadios({ onSave }: { onSave?: (theme: ThemeName) => void | Promise<unknown> }) {
  const { theme, setTheme } = useTheme();
  return (
    <fieldset className="flex flex-wrap gap-3">
      <legend className="sr-only">Theme</legend>
      {themeNames.map((t) => (
        <label
          key={t}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 has-focus-visible:ring-2 has-focus-visible:ring-ring",
            theme === t && "border-primary bg-accent text-accent-foreground",
          )}
        >
          <input
            type="radio"
            name="theme"
            value={t}
            checked={theme === t}
            onChange={() => {
              setTheme(t);
              void onSave?.(t);
            }}
            className="sr-only"
          />
          <Swatch theme={t} />
          <span className="font-medium">{themeLabels[t]}</span>
          {theme === t && <Check aria-hidden className="size-4" />}
        </label>
      ))}
    </fieldset>
  );
}
