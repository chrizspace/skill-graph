import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { focusView, overview, roleView } from "@/domain/explore";
import { seedGraph } from "@/domain/testing/seed-graph";
import { layoutFor, toElements } from "@/lib/graph-style";
import { GraphCanvas } from "./graph-canvas";

const graph = seedGraph();
const story = (view: ReturnType<typeof overview>) => ({
  elements: toElements(graph, view),
  layout: layoutFor(view),
});

const meta = {
  title: "Graph/Canvas",
  component: GraphCanvas,
  args: { selectedId: null, onSelect: () => {}, label: "Skill graph" },
  decorators: [(Story) => <div className="h-[32rem]">{Story()}</div>],
  // the drawing is a canvas: it has no text for the accessibility check to read; the table view and panel carry the content
  parameters: { a11y: { test: "todo" } },
} satisfies Meta<typeof GraphCanvas>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = { args: story(overview(graph)) };
export const RoleInRings: Story = {
  args: story(roleView(graph, "Scrum Master", ["Scrum Master: SAFe"])),
  parameters: {
    docs: {
      description: {
        story:
          "Critical in the inner ring, then Important, then Nice to have; weights also as line styles and in the labels.",
      },
    },
  },
};
export const Neighbourhood: Story = { args: story(focusView(graph, "Databricks", 2)) };
