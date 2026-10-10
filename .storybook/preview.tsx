import type { Preview } from "@storybook/nextjs-vite";
import { TooltipProvider } from "@/components/ui/tooltip";
import "../src/app/globals.css";
import "./preview.css";
import { defaultTheme } from "../src/design-system/theme";
import { themeLabels, themeNames } from "../src/design-system/tokens";

const preview: Preview = {
  tags: ["autodocs"],
  // the toolbar's theme picker sets data-theme on the preview and docs pages
  globalTypes: {
    theme: {
      description: "Theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: themeNames.map((t) => ({ value: t, title: themeLabels[t] })),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: defaultTheme },
  decorators: [
    (Story, context) => {
      document.documentElement.setAttribute("data-theme", context.globals.theme ?? defaultTheme);
      return <Story />;
    },
    (Story) => (
      <TooltipProvider>
        <div className="bg-background p-4 text-foreground">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
  parameters: {
    layout: "padded",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // fail the a11y panel on violations rather than only listing them
    a11y: { test: "error" },
    options: { storySort: { order: ["Design system", ["Overview"], "App", "Graph", "Domain", "UI"] } },
  },
};

export default preview;
