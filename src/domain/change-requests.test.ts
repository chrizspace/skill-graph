import { describe, expect, it } from "vitest";
import {
  changesSchema,
  describeChange,
  isPending,
  REQUEST_STATUS_LABEL,
  requestStatuses,
  type Names,
} from "./change-requests";

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

describe("describeChange", () => {
  const other = "7a2d3c0f-4d2b-4a8f-8b62-3c8e2d1f5b21";
  const known: Record<string, string> = { [id]: "Kubernetes", [other]: "Platform Engineer" };
  const names: Names = { name: (x) => known[x] ?? "an item that no longer exists" };
  const text = (change: unknown) => describeChange(changesSchema.parse([change])[0], names);

  it("says what each operation does", () => {
    expect(
      text({ op: "add_requirement", itemId: id, priority: "important", note: "All projects use it" }),
    ).toBe("Require “Kubernetes” as Important (All projects use it)");
    expect(
      text({
        op: "add_requirement",
        newItem: { name: "Playwright", type: "technical_skill" },
        priority: "nice",
      }),
    ).toBe("Require “Playwright” (a new technical skill) as Nice to have");
    expect(text({ op: "update_requirement", itemId: id, priority: "critical" })).toBe(
      "For “Kubernetes”: make it Critical",
    );
    expect(text({ op: "update_requirement", itemId: id, note: "" })).toBe(
      "For “Kubernetes”: remove its note",
    );
    expect(text({ op: "remove_requirement", itemId: id })).toBe("Stop requiring “Kubernetes”");
    expect(text({ op: "add_path", toId: other, typicalMonths: 12, note: "After two years" })).toBe(
      "Add an official path to “Platform Engineer”, typically 12 months (After two years)",
    );
    expect(text({ op: "remove_path", toId: other })).toBe("Remove the official path to “Platform Engineer”");
    expect(text({ op: "update_description", description: "Builds things." })).toBe(
      "Change the description to: Builds things.",
    );
    expect(text({ op: "propose_role", name: "Platform Engineer", description: "Runs the platform." })).toBe(
      "Propose a new role “Platform Engineer”: Runs the platform.",
    );
    expect(text({ op: "propose_specialization", name: "Kanban", description: "Flow." })).toBe(
      "Propose a new specialisation “Kanban”: Flow.",
    );
  });
  it("names an item that has gone as such", () => {
    expect(text({ op: "remove_requirement", itemId: "6f1c2b9e-3c1a-4f7e-9a51-2b7d1c0e4a99" })).toBe(
      "Stop requiring “an item that no longer exists”",
    );
  });
});

describe("request statuses", () => {
  it("only open and needs-information requests are pending", () => {
    expect(requestStatuses.filter(isPending)).toEqual(["open", "needs_info"]);
    expect(Object.keys(REQUEST_STATUS_LABEL)).toEqual([...requestStatuses]);
  });
});
