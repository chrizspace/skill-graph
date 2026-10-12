import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { navigationFor } from "@/domain/navigation";
import { Sidebar } from "./sidebar";

const person = { userId: "u", name: "Jordan Kim", email: "jordan.kim@example.com", practiceId: null };

const meta = {
  title: "App/Sidebar",
  component: Sidebar,
  parameters: { nextjs: { navigation: { pathname: "/site/people" } }, layout: "fullscreen" },
  // the sidebar only shows from 768px
  decorators: [(Story) => <div className="flex min-h-96 [&_aside]:block">{Story()}</div>],
  args: { groups: navigationFor({ ...person, reportCount: 3, leadOf: [], siteLead: true }) },
} satisfies Meta<typeof Sidebar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
