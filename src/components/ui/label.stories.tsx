import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "./input";
import { Label } from "./label";

const meta = { title: "UI/Label", component: Label } satisfies Meta<typeof Label>;
export default meta;

export const WithInput: StoryObj<typeof meta> = {
  render: () => (
    <div className="grid max-w-sm gap-2">
      <Label htmlFor="obtained">Date obtained</Label>
      <Input id="obtained" type="date" />
    </div>
  ),
};
