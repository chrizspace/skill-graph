import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ThemeSwitcher } from "./theme-switcher";

const meta = {
  title: "Theme/Theme switcher",
  component: ThemeSwitcher,
  parameters: {
    docs: {
      description: {
        component:
          "Switches the colour theme (Orange / Violet) and the mode. Try it: the whole page follows.",
      },
    },
  },
} satisfies Meta<typeof ThemeSwitcher>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
