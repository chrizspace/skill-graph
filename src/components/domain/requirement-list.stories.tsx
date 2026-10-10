import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { GraphNode, Requirement } from "@/domain/graph";
import { RequirementList } from "./requirement-list";

const item = (name: string, type: GraphNode["type"]): GraphNode => ({
  id: name,
  type,
  name,
  slug: name.toLowerCase().replace(/\W+/g, "-"),
  category: null,
  practiceId: null,
  parentRoleId: null,
  status: "published",
  issuer: null,
});
const req = (
  name: string,
  type: GraphNode["type"],
  weight: Requirement["weight"],
  note: string | null = null,
): Requirement => ({ item: item(name, type), weight, note, from: "core" });

const meta = {
  title: "Domain/Requirement list",
  component: RequirementList,
  args: {
    requirements: [
      req("Scrum", "technical_skill", "critical"),
      req("Agile", "technical_skill", "critical"),
      req("Jira", "technical_skill", "nice"),
      req("Coaching", "soft_skill", "critical", "Coaching the team is most of the job."),
      req("Facilitation", "soft_skill", "important"),
      req("Professional Scrum Master I (PSM I)", "certification", "critical"),
    ],
  },
} satisfies Meta<typeof RequirementList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ByTypeAndWeight: Story = {};
export const Empty: Story = { args: { requirements: [] } };
