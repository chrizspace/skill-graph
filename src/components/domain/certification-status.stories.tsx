import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CertificationStatus } from "./certification-status";

const meta = {
  title: "Domain/Certification status",
  component: CertificationStatus,
  args: { name: "Professional Scrum Master I (PSM I)", status: "valid", expiresOn: null },
} satisfies Meta<typeof CertificationStatus>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Valid: Story = {};
export const Expiring: Story = {
  args: { name: "SAFe Scrum Master (SSM)", status: "expiring", expiresOn: "2026-11-14" },
};
export const Expired: Story = {
  args: { name: "Power BI Data Analyst (PL-300)", status: "expired", expiresOn: "2026-08-01" },
  parameters: {
    docs: { description: { story: "Faded, but it still counts as held: the person once earned it." } },
  },
};
