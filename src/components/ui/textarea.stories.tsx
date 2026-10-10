import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Textarea } from "./textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  args: { "aria-label": "Description", placeholder: "What does the role do?" },
} satisfies Meta<typeof Textarea>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
export const Filled: StoryObj<typeof meta> = {
  args: { defaultValue: "Helps teams work in an agile way: coaches Scrum and removes impediments." },
};
