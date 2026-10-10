import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { navigationFor } from "@/domain/navigation";
import { MobileNav } from "./mobile-nav";

const actor = {
  userId: "u",
  name: "Riley Nowak",
  email: "riley.nowak@example.com",
  practiceId: null,
  reportCount: 5,
  leadOf: [],
  siteLead: false,
};

const meta = {
  title: "App/Mobile menu",
  component: MobileNav,
  args: { groups: navigationFor(actor) },
  parameters: { nextjs: { navigation: { pathname: "/team" } } },
  decorators: [(Story) => <div className="relative h-[28rem]">{Story()}</div>],
} satisfies Meta<typeof MobileNav>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Open menu" }));
    await expect(canvas.getByRole("link", { name: "My team" })).toHaveAttribute("aria-current", "page");
  },
};
