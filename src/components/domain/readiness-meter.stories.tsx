import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ReadinessMeter } from "./readiness-meter";

const meta = {
  title: "Domain/Readiness meter",
  component: ReadinessMeter,
  args: {
    label: "Full-stack Developer",
    readiness: { score: 16 / 21, criticalMet: true, band: "reachable" },
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ReadinessMeter>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Reachable: Story = {};
export const Stretch: Story = {
  args: { label: "Scrum Master", readiness: { score: 0.55, criticalMet: false, band: "stretch" } },
};
export const Far: Story = {
  args: { label: "Data Engineer", readiness: { score: 0.27, criticalMet: false, band: "far" } },
};
