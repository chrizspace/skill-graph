import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Skeleton } from "./skeleton";

const meta = { title: "UI/Skeleton", component: Skeleton } satisfies Meta<typeof Skeleton>;
export default meta;

export const Card: StoryObj<typeof meta> = {
  render: () => (
    <div className="grid max-w-sm gap-2">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  ),
};
