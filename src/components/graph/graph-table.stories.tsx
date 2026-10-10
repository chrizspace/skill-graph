import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GraphTable } from "./graph-table";

const meta = {
  title: "Graph/Table view",
  component: GraphTable,
  args: {
    caption: "Data Engineer and what it requires",
    onFocus: () => {},
    rows: [
      { id: "1", name: "Data Engineer", type: "Role", weight: null, state: null, links: 12 },
      { id: "2", name: "SQL", type: "Technical skill", weight: "critical", state: "missing", links: 5 },
      { id: "3", name: "Spark", type: "Technical skill", weight: "important", state: "met", links: 4 },
      {
        id: "4",
        name: "Databricks Certified Data Engineer Associate",
        type: "Certification",
        weight: null,
        state: "expired",
        links: 2,
      },
    ],
  },
} satisfies Meta<typeof GraphTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithMyView: Story = { args: { showState: true } };
