import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChangeBuilder, type BuilderData } from "./change-builder";

const data: BuilderData = {
  about: "role",
  items: [
    { id: "6f1c2b9e-3c1a-4f7e-9a51-2b7d1c0e4a10", name: "Kubernetes", type: "technical_skill" },
    { id: "6f1c2b9e-3c1a-4f7e-9a51-2b7d1c0e4a11", name: "Mentoring", type: "soft_skill" },
    {
      id: "6f1c2b9e-3c1a-4f7e-9a51-2b7d1c0e4a12",
      name: "Azure Fundamentals (AZ-900)",
      type: "certification",
    },
    { id: "6f1c2b9e-3c1a-4f7e-9a51-2b7d1c0e4a13", name: "Jira", type: "technical_skill" },
  ],
  requirements: [
    { itemId: "6f1c2b9e-3c1a-4f7e-9a51-2b7d1c0e4a13", name: "Jira", weight: "important", note: "" },
  ],
  paths: [{ toId: "6f1c2b9e-3c1a-4f7e-9a51-2b7d1c0e4a20", label: "Product Owner" }],
  targets: [
    { id: "6f1c2b9e-3c1a-4f7e-9a51-2b7d1c0e4a20", label: "Product Owner" },
    { id: "6f1c2b9e-3c1a-4f7e-9a51-2b7d1c0e4a21", label: "Project Manager" },
  ],
  description: "Helps teams work in an agile way.",
};

const meta = {
  title: "App/Change builder",
  component: ChangeBuilder,
  args: { data },
  parameters: {
    docs: {
      description: {
        component:
          "Builds the list of operations of a change request. The list travels in a hidden field named `changes`.",
      },
    },
  },
} satisfies Meta<typeof ChangeBuilder>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Feedback: Story = {};
export const NewRoleProposal: Story = {
  args: { data: { ...data, about: "new_role", requirements: [], paths: [] } },
};
export const ForASpecialisation: Story = { args: { data: { ...data, about: "specialization" } } };
