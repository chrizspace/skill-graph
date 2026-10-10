import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ThemeRadios } from "./theme-switch";

const meta = {
  title: "App/Theme switch",
  component: ThemeRadios,
  parameters: {
    docs: {
      description: {
        component:
          "The choice applies at once and is applied before the page paints; on the profile page it is also saved on the profile.",
      },
    },
  },
} satisfies Meta<typeof ThemeRadios>;
export default meta;

export const Radios: StoryObj<typeof meta> = {};
