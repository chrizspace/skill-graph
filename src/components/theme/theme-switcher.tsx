"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { themeLabels, themeNames, type ThemeName } from "@/design-system/tokens";
import type { ModePreference } from "@/design-system/theme";
import { useThemePreferences } from "./theme-store";

const swatch: Record<ThemeName, string> = { orange: "bg-orange-500", violet: "bg-violet-500" };
const modes: { value: ModePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

/** Switches the colour theme (Orange / Violet) and the mode (light / dark / system). Remembered in this browser. */
export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, mode, setTheme, setMode } = useThemePreferences();
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={theme}
        onValueChange={(v) => v && setTheme(v as ThemeName)}
        aria-label="Colour theme"
      >
        {themeNames.map((t) => (
          <ToggleGroupItem key={t} value={t} aria-label={`${themeLabels[t]} theme`}>
            <span aria-hidden className={cn("size-3 rounded-full", swatch[t])} />
            {themeLabels[t]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={mode}
        onValueChange={(v) => v && setMode(v as ModePreference)}
        aria-label="Light or dark"
      >
        {modes.map(({ value, label, Icon }) => (
          <ToggleGroupItem key={value} value={value} aria-label={label} title={label}>
            <Icon aria-hidden />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
