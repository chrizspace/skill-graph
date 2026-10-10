import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { MyState } from "@/domain/explore";
import { seedGraph } from "@/domain/testing/seed-graph";
import { GraphPanel } from "./graph-panel";

const graph = seedGraph();
const states = new Map<string, MyState>([
  ["SQL", "missing"],
  ["Spark", "met"],
]);

const meta = {
  title: "Graph/Details panel",
  component: GraphPanel,
  args: {
    graph,
    selectedId: "Data Engineer",
    focusId: null,
    selectedSpecs: [],
    onFocus: () => {},
    onToggleSpec: () => {},
  },
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
} satisfies Meta<typeof GraphPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Role: Story = {};
export const RoleWithSpecializations: Story = {
  args: { selectedId: "Scrum Master", selectedSpecs: ["Scrum Master: SAFe"] },
};
export const SkillInFocus: Story = {
  args: { selectedId: "SQL", focusId: "Data Engineer", states },
  parameters: {
    docs: {
      description: {
        story: "A skill: its weight for the role in focus, my state, and the roles that need it.",
      },
    },
  },
};
export const Nothing: Story = { args: { selectedId: null } };
