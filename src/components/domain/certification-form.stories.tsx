import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CertificationForm } from "./certification-form";

const meta = {
  title: "Domain/Certification form",
  component: CertificationForm,
  args: {
    action: async () => ({ error: "A certification can't expire before it was obtained." }),
    options: [
      { id: "1", name: "Professional Scrum Master I (PSM I)" },
      { id: "2", name: "Azure Fundamentals (AZ-900)" },
    ],
  },
} satisfies Meta<typeof CertificationForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Add: Story = {};
export const EditDates: Story = {
  args: {
    options: undefined,
    fixed: { id: "1", name: "PSM I" },
    defaults: { obtainedOn: "2025-01-31", expiresOn: "2027-01-31" },
  },
};
