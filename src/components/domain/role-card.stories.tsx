import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RoleCard } from "./role-card";

const meta = {
  title: "Domain/Role card",
  component: RoleCard,
  args: {
    name: "Scrum Master",
    slug: "scrum-master",
    practice: "Delivery Management",
    description:
      "Helps a team deliver with Scrum: facilitates the events, removes impediments and coaches the team.",
    coreCounts: { critical: 5, important: 3, nice: 3 },
    specializations: ["Facilitation / Management 3.0", "SAFe"],
  },
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
} satisfies Meta<typeof RoleCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithSpecializations: Story = {};
export const Plain: Story = { args: { name: "Data Engineer", slug: "data-engineer", specializations: [] } };
