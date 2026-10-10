import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeMenuGroup, ThemeRadios } from "./theme-switch";

const meta = {
  title: "App/Theme switch",
  component: ThemeRadios,
  parameters: {
    docs: {
      description: { component: "The choice is kept in this browser and applied before the page paints." },
    },
  },
} satisfies Meta<typeof ThemeRadios>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Radios: Story = {};
export const InMenu: Story = {
  render: () => (
    <DropdownMenu open>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Account</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <ThemeMenuGroup />
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
