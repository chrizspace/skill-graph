import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./select";

const meta = { title: "UI/Select", component: Select } satisfies Meta<typeof Select>;
export default meta;

export const Weight: StoryObj<typeof meta> = {
  render: () => (
    <Select defaultValue="important">
      <SelectTrigger className="w-48" aria-label="Weight">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Weight</SelectLabel>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="important">Important</SelectItem>
          <SelectItem value="nice">Nice to have</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};
