import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GraphLegend } from "./graph-legend";

const meta = {
  title: "Graph/Legend",
  component: GraphLegend,
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
} satisfies Meta<typeof GraphLegend>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithMyView: Story = { args: { showMyView: true } };
