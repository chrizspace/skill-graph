import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { assess } from "@/domain/assess";
import { seedGraph, seedProfile, target } from "@/domain/testing/seed-graph";
import { AssessmentList } from "./assessment-list";

const today = new Date("2026-10-10T12:00:00Z");
const graph = seedGraph();
const fit = (person: string, role: string, specialization?: string) =>
  assess(graph, seedProfile(person, today), target(role, specialization), today);

const meta = { title: "Domain/Assessment list", component: AssessmentList } satisfies Meta<
  typeof AssessmentList
>;
export default meta;
type Story = StoryObj<typeof meta>;

const alex = fit("seed-alex", "Data Engineer");
export const FrontendToDataEngineer: Story = {
  args: { missing: alex.missing, met: alex.met },
  parameters: { docs: { description: { story: "Scenario 1: missing items are in learning order." } } },
};

const ella = fit("seed-ella", "Business Analyst");
export const WithExpiredCertification: Story = {
  args: {
    missing: ella.missing,
    met: ella.met,
    expiry: Object.fromEntries(ella.met.filter((m) => m.certification).map((m) => [m.item.id, "2026-08-01"])),
  },
  parameters: {
    docs: { description: { story: "An expired certification is met, shown faded with its expiry date." } },
  },
};
