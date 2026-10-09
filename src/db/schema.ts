/**
 * Database schema (docs/PLAN.md §2). Postgres is a plain store with constraints; graph logic lives in src/domain.
 * Rules that need to look at other rows (edge kinds vs node types, builds_on cycles) are enforced by the domain validator.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const nodeType = pgEnum("node_type", ["role", "skill", "technology"]);
// requires: role → skill/technology (with priority); builds_on: skill/tech → the skill/tech it's built on;
// related_to: skill/tech ↔ skill/tech, undirected, stored with source_id < target_id; next_step: role → role (career move)
export const edgeKind = pgEnum("edge_kind", ["requires", "builds_on", "related_to", "next_step"]);
export const priority = pgEnum("priority", ["critical", "important", "nice"]);
export const appRole = pgEnum("app_role", ["employee", "manager", "admin"]);
export const auditAction = pgEnum("audit_action", ["create", "update", "delete"]);
export const auditEntity = pgEnum("audit_entity", ["node", "edge", "profile", "app_role"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const nodes = pgTable(
  "nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: nodeType("type").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    // lowercase, trimmed, punctuation stripped except + and # (so C# and C++ stay distinct); unique across all types
    normalizedName: text("normalized_name").notNull().unique(),
    description: text("description").notNull().default(""),
    category: text("category"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    // where the node came from, for the V2 imports; manual nodes have no external id
    externalId: text("external_id"),
    source: text("source").notNull().default("manual"),
    ...timestamps,
  },
  (t) => [
    unique("nodes_source_external_id_unique").on(t.source, t.externalId),
    index("nodes_type_idx").on(t.type),
  ],
);

export const edges = pgTable(
  "edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: edgeKind("kind").notNull(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    priority: priority("priority"),
    // drawn as line thickness: 1 (weak) to 5 (strong)
    strength: smallint("strength").notNull().default(3),
    externalId: text("external_id"),
    source: text("source").notNull().default("manual"),
    ...timestamps,
  },
  (t) => [
    unique("edges_kind_source_target_unique").on(t.kind, t.sourceId, t.targetId),
    unique("edges_source_external_id_unique").on(t.source, t.externalId),
    check("edges_no_self_loop", sql`${t.sourceId} <> ${t.targetId}`),
    check("edges_priority_only_on_requires", sql`(${t.kind} = 'requires') = (${t.priority} is not null)`),
    check("edges_strength_range", sql`${t.strength} between 1 and 5`),
    check("edges_related_to_ordered", sql`${t.kind} <> 'related_to' or ${t.sourceId} < ${t.targetId}`),
    index("edges_source_idx").on(t.sourceId),
    index("edges_target_idx").on(t.targetId),
    index("edges_kind_idx").on(t.kind),
  ],
);

// Better Auth's core user table (M3 adds session, account and verification next to it)
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
});

export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    appRole: appRole("app_role").notNull().default("employee"),
    currentRoleId: uuid("current_role_id").references(() => nodes.id, { onDelete: "set null" }),
    managerId: text("manager_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    check("profiles_not_own_manager", sql`${t.managerId} is null or ${t.managerId} <> ${t.userId}`),
    index("profiles_manager_idx").on(t.managerId),
  ],
);

// skills a person declares themselves (yes/no in the MVP, no proficiency levels)
export const profileSkills = pgTable(
  "profile_skills",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.nodeId] }), index("profile_skills_node_idx").on(t.nodeId)],
);

// written in the same transaction as the change it records
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    action: auditAction("action").notNull(),
    entity: auditEntity("entity").notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_at_idx").on(t.at), index("audit_log_entity_idx").on(t.entity, t.entityId)],
);
