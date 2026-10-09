import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar, AvatarFallback } from "./avatar";

const meta = { title: "UI/Avatar", component: Avatar } satisfies Meta<typeof Avatar>;
export default meta;

export const Initials: StoryObj<typeof meta> = {
  render: () => (
    <div className="flex gap-2">
      <Avatar>
        <AvatarFallback>AR</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>SP</AvatarFallback>
      </Avatar>
    </div>
  ),
};
