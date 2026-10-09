import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Separator } from "./separator";

const meta = { title: "UI/Separator", component: Separator } satisfies Meta<typeof Separator>;
export default meta;

export const Default: StoryObj<typeof meta> = {
  render: () => (
    <div className="max-w-sm text-sm">
      <p>Core requirements</p>
      <Separator className="my-3" />
      <p>Specialisations</p>
    </div>
  ),
};
