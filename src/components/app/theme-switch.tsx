"use client";

import { Check } from "lucide-react";
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { themeLabels, themeNames, themes, type ThemeName } from "@/design-system/tokens";
import { useTheme } from "@/lib/use-theme";
import { cn } from "@/lib/utils";

/** A dot in the theme's own colour, so the choice can be seen as well as read. */
const Swatch = ({ theme }: { theme: ThemeName }) => (
  <span
    aria-hidden
    className="inline-block size-3.5 shrink-0 rounded-full border"
    style={{ background: themes[theme].primary }}
  />
);

/** The theme choice inside a menu (the account menu, top right). */
export function ThemeMenuGroup() {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Theme</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeName)}>
        {themeNames.map((t) => (
          <DropdownMenuRadioItem key={t} value={t} className="gap-2">
            <Swatch theme={t} />
            {themeLabels[t]}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );
}

/** The same choice as radio buttons, for the profile page. */
export function ThemeRadios() {
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
            onChange={() => setTheme(t)}
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
