import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { navigationFor } from "@/domain/navigation";
import { NavLinks } from "./nav-links";

const person = { userId: "u", name: "Morgan Lee", email: "morgan.lee@example.com", practiceId: null };
const lead = { id: "1", slug: "frontend", name: "Frontend Practice" };

const meta = {
  title: "App/Navigation",
  component: NavLinks,
  parameters: { nextjs: { navigation: { pathname: "/me/plan" } }, layout: "centered" },
  decorators: [(Story) => <div className="w-60">{Story()}</div>],
} satisfies Meta<typeof NavLinks>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Employee: Story = {
  args: { groups: navigationFor({ ...person, reportCount: 0, leadOf: [], siteLead: false }) },
};
export const Manager: Story = {
  args: { groups: navigationFor({ ...person, reportCount: 5, leadOf: [], siteLead: false }) },
  parameters: { nextjs: { navigation: { pathname: "/team" } } },
};
export const PracticeLead: Story = {
  args: { groups: navigationFor({ ...person, reportCount: 0, leadOf: [lead], siteLead: false }) },
};
export const SiteLead: Story = {
  args: { groups: navigationFor({ ...person, reportCount: 0, leadOf: [], siteLead: true }) },
  parameters: { nextjs: { navigation: { pathname: "/site/people" } } },
};
