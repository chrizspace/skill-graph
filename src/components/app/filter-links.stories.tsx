import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FilterLinks } from "./filter-links";

const meta = {
  title: "App/Filter links",
  component: FilterLinks,
  args: {
    label: "Practice",
    options: [
      { label: "All", href: "?", active: false, count: 19 },
      { label: "Frontend Practice", href: "?practice=frontend", active: true, count: 3 },
      { label: "Data & AI", href: "?practice=data-ai", active: false, count: 5 },
      { label: "Delivery Management", href: "?practice=delivery", active: false, count: 5 },
    ],
  },
} satisfies Meta<typeof FilterLinks>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
