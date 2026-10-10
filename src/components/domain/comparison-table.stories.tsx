import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { compare } from "@/domain/assess";
import { seedGraph, seedProfile, target } from "@/domain/testing/seed-graph";
import { ComparisonTable } from "./comparison-table";

const today = new Date("2026-10-10T12:00:00Z");
const graph = seedGraph();
const c = compare(
  graph,
  target("Frontend Developer", "React"),
  target("Data Engineer"),
  seedProfile("seed-alex", today),
  today,
);

const meta = {
  title: "Domain/Comparison table",
  component: ComparisonTable,
  args: {
    fromLabel: "Frontend Developer: React",
    toLabel: "Data Engineer",
    shared: c.shared,
    onlyTo: c.onlyB,
    onlyFrom: c.onlyA,
  },
} satisfies Meta<typeof ComparisonTable>;
export default meta;

export const WithMyProfile: StoryObj<typeof meta> = {
  parameters: {
    docs: {
      description: {
        story: "Scenario 1 with Alex's profile: shared and added rows say what's held and what's to learn.",
      },
    },
  },
};
