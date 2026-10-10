import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NativeSelect } from "./native-select";

const meta = {
  title: "UI/Native select",
  component: NativeSelect,
  args: { "aria-label": "Target role" },
  render: (args) => (
    <NativeSelect {...args}>
      <option value="">No target</option>
      <optgroup label="Frontend Practice">
        <option>Frontend Developer</option>
        <option>Frontend Developer: React</option>
      </optgroup>
      <optgroup label="Data & AI">
        <option>Data Engineer</option>
      </optgroup>
    </NativeSelect>
  ),
} satisfies Meta<typeof NativeSelect>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
export const Disabled: StoryObj<typeof meta> = { args: { disabled: true } };
