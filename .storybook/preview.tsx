import type { Preview } from "@storybook/nextjs-vite";
import { TooltipProvider } from "@/components/ui/tooltip";
import "../src/app/globals.css";
import "./preview.css";

const preview: Preview = {
  tags: ["autodocs"],
  decorators: [
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
    options: { storySort: { order: ["Design system", ["Overview"], "Domain", "UI"] } },
  },
};

export default preview;
