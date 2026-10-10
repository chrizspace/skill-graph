import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MicrosoftButton } from "./microsoft-button";

const meta = {
  title: "App/Microsoft sign-in",
  component: MicrosoftButton,
  args: { next: "/" },
} satisfies Meta<typeof MicrosoftButton>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
