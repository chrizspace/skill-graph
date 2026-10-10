import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { navigationFor } from "@/domain/navigation";
import { AppShell } from "./app-shell";

const actor = {
  userId: "u",
  name: "Morgan Lee",
  email: "morgan.lee@example.com",
  practiceId: null,
  reportCount: 5,
  leadOf: [],
  siteLead: false,
};

const meta = {
  title: "App/App shell",
  component: AppShell,
  parameters: { layout: "fullscreen", nextjs: { navigation: { pathname: "/team" } } },
  args: {
    groups: navigationFor(actor),
    user: actor,
    signOut: async () => {},
    children: <h1 className="text-3xl font-bold tracking-tight">My team</h1>,
  },
} satisfies Meta<typeof AppShell>;
export default meta;

export const Manager: StoryObj<typeof meta> = {};
export const Mobile: StoryObj<typeof meta> = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  globals: { viewport: { value: "mobile1" } },
};
