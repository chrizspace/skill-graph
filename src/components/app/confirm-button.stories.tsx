import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ConfirmButton } from "./confirm-button";

const meta = {
  title: "App/Confirm button",
  component: ConfirmButton,
  args: {
    action: async () => {},
    label: "Delete role",
    title: "Delete Frontend Developer?",
    confirmLabel: "Yes, delete it",
    children: (
      <>
        <p>This also deletes its 2 specialisations and 31 links, and can&apos;t be undone.</p>
        <p>3 people have it as their role or target; they will have to pick another.</p>
      </>
    ),
  },
} satisfies Meta<typeof ConfirmButton>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
