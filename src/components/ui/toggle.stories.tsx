import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bold } from "lucide-react";
import { Toggle } from "./toggle";

const meta = { title: "UI/Toggle", component: Toggle } satisfies Meta<typeof Toggle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Show expired", "aria-label": "Show expired certifications" },
};
export const Outline: Story = { args: { variant: "outline", children: <Bold />, "aria-label": "Bold" } };
