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

export const changesSchema = z.array(changeSchema).min(1).max(50);

export type Change = z.infer<typeof changeSchema>;
