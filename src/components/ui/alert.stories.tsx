import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CircleAlert, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./alert";

const meta = { title: "UI/Alert", component: Alert } satisfies Meta<typeof Alert>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Alert>
      <Info />
      <AlertTitle>Your profile was pre-filled</AlertTitle>
      <AlertDescription>
        We added the skills of your role. Untick what you don&apos;t have yet.
      </AlertDescription>
    </Alert>
  ),
};
export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>This request no longer applies</AlertTitle>
      <AlertDescription>Frontend Developer doesn&apos;t require SQL any more.</AlertDescription>
    </Alert>
  ),
};
