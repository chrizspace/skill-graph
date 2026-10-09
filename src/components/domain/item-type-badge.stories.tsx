import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ItemTypeBadge } from "./item-type-badge";

const meta = {
  title: "Domain/Item type badge",
  component: ItemTypeBadge,
  args: { type: "technical_skill" },
} satisfies Meta<typeof ItemTypeBadge>;
export default meta;

export const All: StoryObj<typeof meta> = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <ItemTypeBadge type="technical_skill" />
      <ItemTypeBadge type="soft_skill" />
      <ItemTypeBadge type="certification" />
    </div>
  ),
};
