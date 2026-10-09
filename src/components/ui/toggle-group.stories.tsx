import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const meta = { title: "UI/Toggle group", component: ToggleGroup, args: { type: "single" } } satisfies Meta<
  typeof ToggleGroup
>;
export default meta;

export const Weights: StoryObj<typeof meta> = {
  render: () => (
    <ToggleGroup
      type="multiple"
      variant="outline"
      defaultValue={["critical", "important"]}
      aria-label="Filter by weight"
    >
      <ToggleGroupItem value="critical">Critical</ToggleGroupItem>
      <ToggleGroupItem value="important">Important</ToggleGroupItem>
      <ToggleGroupItem value="nice">Nice to have</ToggleGroupItem>
    </ToggleGroup>
  ),
};
