import { describe, expect, it } from "vitest";
import { changesSchema } from "./change-requests";

const id = "6f1c2b9e-3c1a-4f7e-9a51-2b7d1c0e4a10";

describe("changesSchema", () => {
  it("accepts every kind of operation", () => {
    expect(() =>
      changesSchema.parse([
        { op: "add_requirement", itemId: id, priority: "important", note: "All projects use it" },
        { op: "add_requirement", newItem: { name: "Playwright", type: "technical_skill" }, priority: "nice" },
        { op: "update_requirement", itemId: id, priority: "critical" },
        { op: "remove_requirement", itemId: id },
        { op: "add_path", toId: id, typicalMonths: 12 },
        { op: "remove_path", toId: id },
        { op: "update_description", description: "Builds things." },
        { op: "propose_role", name: "Platform Engineer", description: "Runs the internal platform." },
        { op: "propose_specialization", name: "Kanban", description: "Flow-based teams." },
      ]),
    ).not.toThrow();
  });

  it("needs exactly one of an existing item or a new one", () => {
    expect(changesSchema.safeParse([{ op: "add_requirement", priority: "nice" }]).success).toBe(false);
    expect(
      changesSchema.safeParse([
        { op: "add_requirement", itemId: id, newItem: { name: "X", type: "soft_skill" }, priority: "nice" },
      ]).success,
    ).toBe(false);
  });

  it("rejects empty requests, unknown operations, bad weights and non-uuid references", () => {
    expect(changesSchema.safeParse([]).success).toBe(false);
    expect(changesSchema.safeParse([{ op: "rename_everything" }]).success).toBe(false);
    expect(
      changesSchema.safeParse([{ op: "update_requirement", itemId: id, priority: "urgent" }]).success,
    ).toBe(false);
    expect(changesSchema.safeParse([{ op: "remove_requirement", itemId: "SQL" }]).success).toBe(false);
  });
});
