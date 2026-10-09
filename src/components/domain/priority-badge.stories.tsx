import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PriorityBadge } from "./priority-badge";

const meta = {
  title: "Domain/Priority badge",
  component: PriorityBadge,
  args: { weight: "critical" },
} satisfies Meta<typeof PriorityBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Critical: Story = {};
export const Important: Story = { args: { weight: "important" } };
export const NiceToHave: Story = { args: { weight: "nice" } };
export const All: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <PriorityBadge weight="critical" />
      <PriorityBadge weight="important" />
      <PriorityBadge weight="nice" />
    </div>
  ),
};
