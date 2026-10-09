import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "./badge";

const meta = { title: "UI/Badge", component: Badge, args: { children: "Badge" } } satisfies Meta<
  typeof Badge
>;
export default meta;

export const Variants: StoryObj<typeof meta> = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="destructive">Destructive</Badge>
    </div>
  ),
};
