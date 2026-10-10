import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { developmentPlan } from "@/domain/plan";
import { seedGraph, seedProfile, target } from "@/domain/testing/seed-graph";
import { PlanSteps } from "./plan-steps";

const today = new Date("2026-10-10T12:00:00Z");
const graph = seedGraph();
const plan = developmentPlan(
  graph,
  seedProfile("seed-alex", today),
  target("Data Engineer"),
  [{ nodeId: "Spark", status: "accepted" }],
  today,
);

const meta = { title: "Domain/Plan steps", component: PlanSteps, args: { steps: plan.steps } } satisfies Meta<
  typeof PlanSteps
>;
export default meta;

export const LearningOrder: StoryObj<typeof meta> = {};
export const Done: StoryObj<typeof meta> = { args: { steps: [] } };
