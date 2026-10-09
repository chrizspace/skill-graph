import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Progress } from "./progress";

const meta = {
  title: "UI/Progress",
  component: Progress,
  args: { value: 62, "aria-label": "Progress" },
} satisfies Meta<typeof Progress>;
export default meta;

export const Default: StoryObj<typeof meta> = {
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};
