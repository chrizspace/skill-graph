import { z } from "zod";

/**
 * The operations a change request carries (docs/PLAN.md §1 "Change request", §3 `change_requests.changes`).
 * Stored as jsonb; every read and write goes through `changesSchema`. Items and roles are referenced by node id.
 */
export const priorities = ["critical", "important", "nice"] as const;
export const catalogueTypes = ["technical_skill", "soft_skill", "certification"] as const;

const priority = z.enum(priorities);
const nodeId = z.uuid();
const note = z.string().trim().max(500).optional();

const newItem = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(catalogueTypes),
  issuer: z.string().trim().max(120).optional(),
});

export const changeSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("add_requirement"),
      itemId: nodeId.optional(),
      newItem: newItem.optional(),
      priority,
      note,
    })
    .refine(
      (c) => Boolean(c.itemId) !== Boolean(c.newItem),
      "Give either an existing item or a new one, not both.",
    ),
  z.object({ op: z.literal("update_requirement"), itemId: nodeId, priority: priority.optional(), note }),
  z.object({ op: z.literal("remove_requirement"), itemId: nodeId }),
  z.object({
    op: z.literal("add_path"),
    toId: nodeId,
    note,
    typicalMonths: z.number().int().min(1).max(120).optional(),
  }),
  z.object({ op: z.literal("remove_path"), toId: nodeId }),
  z.object({ op: z.literal("update_description"), description: z.string().trim().min(1).max(2000) }),
  z.object({
    op: z.literal("propose_role"),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(2000),
  }),
  z.object({
    op: z.literal("propose_specialization"),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(2000),
  }),
]);

export const changesSchema = z
  .array(changeSchema)
  .min(1, "Add at least one change to the request.")
  .max(50, "A request can carry at most 50 changes.");

export type Change = z.infer<typeof changeSchema>;

/** Where a request stands. Open and needs-info are the two states in which it can still be answered or decided. */
export const requestStatuses = ["open", "needs_info", "approved", "rejected", "withdrawn"] as const;
export type RequestStatus = (typeof requestStatuses)[number];

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  open: "Open",
  needs_info: "Needs information",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const isPending = (status: RequestStatus) => status === "open" || status === "needs_info";

const WEIGHT_TEXT = { critical: "Critical", important: "Important", nice: "Nice to have" } as const;
const TYPE_TEXT = {
  technical_skill: "technical skill",
  soft_skill: "soft skill",
  certification: "certification",
} as const;

/** How to name the things an operation points at: the server answers from the graph, the browser from what it was given. */
export interface Names {
  /** an item, or a role or specialisation, by id; a gone one reads as such */
  name: (id: string) => string;
}

const quote = (name: string) => `“${name}”`;

/** One operation in words, for the person who sends the request and the one who reviews it. */
export function describeChange(change: Change, names: Names): string {
  const note = (n?: string) => (n ? ` (${n})` : "");
  switch (change.op) {
    case "add_requirement": {
      const what = change.itemId
        ? quote(names.name(change.itemId))
        : `${quote(change.newItem!.name)} (a new ${TYPE_TEXT[change.newItem!.type]})`;
      return `Require ${what} as ${WEIGHT_TEXT[change.priority]}${note(change.note)}`;
    }
    case "update_requirement": {
      const parts = [
        change.priority ? `make it ${WEIGHT_TEXT[change.priority]}` : "",
        change.note !== undefined ? (change.note ? `note: ${change.note}` : "remove its note") : "",
      ].filter(Boolean);
      return `For ${quote(names.name(change.itemId))}: ${parts.join(", ") || "no change"}`;
    }
    case "remove_requirement":
      return `Stop requiring ${quote(names.name(change.itemId))}`;
    case "add_path":
      return `Add an official path to ${quote(names.name(change.toId))}${change.typicalMonths ? `, typically ${change.typicalMonths} months` : ""}${note(change.note)}`;
    case "remove_path":
      return `Remove the official path to ${quote(names.name(change.toId))}`;
    case "update_description":
      return `Change the description to: ${change.description}`;
    case "propose_role":
      return `Propose a new role ${quote(change.name)}: ${change.description}`;
    case "propose_specialization":
      return `Propose a new specialisation ${quote(change.name)}: ${change.description}`;
  }
}
