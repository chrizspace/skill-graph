import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { permissionMatrix } from "@/domain/permissions";
import { PermissionsTable } from "./permissions-table";

const meta = {
  title: "Domain/Permissions table",
  component: PermissionsTable,
  args: { groups: permissionMatrix() },
} satisfies Meta<typeof PermissionsTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const OneGroup: Story = { args: { groups: permissionMatrix().slice(2, 3) } };
