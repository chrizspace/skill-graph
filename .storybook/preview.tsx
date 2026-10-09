import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { useEffect, type ReactNode } from "react";
import { setThemePreferences } from "@/components/theme/theme-store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { themeLabels, themeNames, type ThemeName } from "@/design-system/tokens";
import "../src/app/globals.css";
import "./preview.css";

/** Applies the toolbar's theme and mode to the page, the same way the app's switcher does. */
function ThemeFrame({
  theme,
  mode,
  children,
}: {
  theme: ThemeName;
  mode: "light" | "dark";
  children: ReactNode;
}) {
  useEffect(() => setThemePreferences({ theme, mode }), [theme, mode]);
  return (
    <TooltipProvider>
      <div className="bg-background p-4 text-foreground">{children}</div>
    </TooltipProvider>
  );
}

const withTheme: Decorator = (Story, context) => (
  <ThemeFrame theme={context.globals.theme as ThemeName} mode={context.globals.mode as "light" | "dark"}>
    <Story />
  </ThemeFrame>
);

const preview: Preview = {
  tags: ["autodocs"],
  decorators: [withTheme],
  initialGlobals: { theme: "orange", mode: "light" },
  globalTypes: {
    theme: {
      description: "Colour theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: themeNames.map((t) => ({ value: t, title: themeLabels[t] })),
        dynamicTitle: true,
      },
    },
    mode: {
      description: "Light or dark",
      toolbar: {
        title: "Mode",
        icon: "mirror",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: "padded",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // fail the a11y panel on violations rather than only listing them
    a11y: { test: "error" },
    options: { storySort: { order: ["Design system", ["Overview"], "Theme", "Domain", "UI"] } },
  },
};

export default preview;
