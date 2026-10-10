import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Label } from "@/components/ui/label";
import { ActionForm, ActionInput, ActionTextarea, type ActionState } from "./action-form";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;
const refused: Action = async (_state, formData) => ({
  error: "“Scrum Master” already exists: roles and skills share one set of names.",
  values: { name: String(formData.get("name")), description: String(formData.get("description")) },
});
const saved: Action = async () => ({ ok: "Saved." });

const meta = {
  title: "App/Action form",
  component: ActionForm,
  parameters: {
    docs: {
      description: {
        component:
          "Runs a server action; shows the problems to fix (the fields keep what was typed) or a confirmation.",
      },
    },
  },
  args: {
    submit: "Save",
    action: refused,
    children: (
      <>
        <div className="grid gap-1.5">
          <Label htmlFor="name">Name</Label>
          <ActionInput id="name" name="name" defaultValue="Scrum Master" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="description">Description</Label>
          <ActionTextarea
            id="description"
            name="description"
            defaultValue="Helps a team work in an agile way."
          />
        </div>
      </>
    ),
  },
} satisfies Meta<typeof ActionForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Refused: Story = {};
export const Saved: Story = { args: { action: saved } };
