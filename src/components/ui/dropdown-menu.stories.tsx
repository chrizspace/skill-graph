import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const meta = { title: "UI/Dropdown menu", component: DropdownMenu } satisfies Meta<typeof DropdownMenu>;
export default meta;

export const Default: StoryObj<typeof meta> = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Frontend Developer</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Compare with my profile</DropdownMenuItem>
        <DropdownMenuItem>Set as my target</DropdownMenuItem>
        <DropdownMenuItem>Suggest a change</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
