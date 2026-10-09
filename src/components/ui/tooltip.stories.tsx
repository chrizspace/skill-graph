import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

const meta = { title: "UI/Tooltip", component: Tooltip } satisfies Meta<typeof Tooltip>;
export default meta;

export const Default: StoryObj<typeof meta> = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Readiness</Button>
      </TooltipTrigger>
      <TooltipContent>Weighted share of requirements you meet</TooltipContent>
    </Tooltip>
  ),
};
