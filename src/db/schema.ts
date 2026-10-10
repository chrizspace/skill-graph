/**
 * Database schema (docs/PLAN.md §3). Postgres is a plain store with constraints; graph logic lives in src/domain.
 * Rules that need to look at other rows (edge kinds vs node types, builds_on cycles, a specialisation belonging to the
 * chosen role) are enforced by the domain validator.
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const nodeType = pgEnum("node_type", [
  "role",
  "specialization",
  "technical_skill",
  "soft_skill",
  "certification",
]);
// drafts come from approved proposals and are visible only to Practice Leads until published
export const nodeStatus = pgEnum("node_status", ["draft", "published"]);
// requires: role/specialisation → catalogue item (with priority); builds_on: item → the item it builds on;
// related_to: item ↔ item, undirected, stored with source_id < target_id; next_step: official path between roles/specialisations
export const edgeKind = pgEnum("edge_kind", ["requires", "builds_on", "related_to", "next_step"]);
export const priority = pgEnum("priority", ["critical", "important", "nice"]);
export const recommendationStatus = pgEnum("recommendation_status", ["open", "accepted", "declined"]);
export const changeRequestStatus = pgEnum("change_request_status", [
  "open",
  "needs_info",
  "approved",
  "rejected",
  "withdrawn",
]);
export const auditAction = pgEnum("audit_action", ["create", "update", "delete"]);
export const auditEntity = pgEnum("audit_entity", [
  "site",
  "practice",
  "node",
  "edge",
  "profile",
  "profile_item",
  "recommendation",
  "change_request",
  "access",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// Better Auth's tables: user, session, account and verification
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

// one row per sign-in method of a person (Microsoft, …)
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// One site per installation in the MVP; the Site Lead oversees its practices
export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ...timestamps,
});

export const siteLeads = pgTable(
  "site_leads",
  {
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.siteId, t.userId] }), index("site_leads_user_idx").on(t.userId)],
);

export const practices = pgTable(
  "practices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    ...timestamps,
  },
  (t) => [unique("practices_site_name_unique").on(t.siteId, t.name)],
);

export const practiceLeads = pgTable(
  "practice_leads",
  {
    practiceId: uuid("practice_id")
      .notNull()
      .references(() => practices.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.practiceId, t.userId] }), index("practice_leads_user_idx").on(t.userId)],
);

/** Roles, their specialisations and the catalogue (technical skills, soft skills, certifications). */
export const nodes = pgTable(
  "nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: nodeType("type").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    // lowercase, punctuation stripped except + and #; unique across roles and catalogue items, and per role for specialisations
    normalizedName: text("normalized_name").notNull(),
    description: text("description").notNull().default(""),
    category: text("category"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: nodeStatus("status").notNull().default("published"),
    // roles belong to a practice; specialisations to a role; certifications have an issuer
    practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "restrict" }),
    parentRoleId: uuid("parent_role_id").references((): AnyPgColumn => nodes.id, { onDelete: "cascade" }),
    issuer: text("issuer"),
    // where the node came from, for the V2 imports; manual nodes have no external id
    externalId: text("external_id"),
    source: text("source").notNull().default("manual"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("nodes_normalized_name_unique")
      .on(t.normalizedName)
      .where(sql`${t.type} <> 'specialization'`),
    unique("nodes_specialization_name_unique").on(t.parentRoleId, t.normalizedName),
    unique("nodes_source_external_id_unique").on(t.source, t.externalId),
    check("nodes_role_has_practice", sql`(${t.type} = 'role') = (${t.practiceId} is not null)`),
    check(
      "nodes_specialization_has_role",
      sql`(${t.type} = 'specialization') = (${t.parentRoleId} is not null)`,
    ),
    check("nodes_issuer_only_on_certifications", sql`${t.issuer} is null or ${t.type} = 'certification'`),
    index("nodes_type_idx").on(t.type),
    index("nodes_practice_idx").on(t.practiceId),
    index("nodes_parent_role_idx").on(t.parentRoleId),
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
    // the weight of a requirement: Critical, Important or Nice to have
    priority: priority("priority"),
    // drawn as line thickness: 1 (weak) to 5 (strong)
    strength: smallint("strength").notNull().default(3),
    // why it matters (any kind); on an official path, its description
    note: text("note"),
    // official paths only: how long the move typically takes
    typicalMonths: smallint("typical_months"),
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
    check(
      "edges_typical_months_only_on_paths",
      sql`${t.typicalMonths} is null or (${t.kind} = 'next_step' and ${t.typicalMonths} > 0)`,
    ),
    index("edges_source_idx").on(t.sourceId),
    index("edges_target_idx").on(t.targetId),
    index("edges_kind_idx").on(t.kind),
  ],
);

/** A person's place in the organisation and their target. Manager, Practice Lead and Site Lead follow from the data. */
export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "set null" }),
    currentRoleId: uuid("current_role_id").references(() => nodes.id, { onDelete: "set null" }),
    currentSpecializationId: uuid("current_specialization_id").references(() => nodes.id, {
      onDelete: "set null",
    }),
    targetRoleId: uuid("target_role_id").references(() => nodes.id, { onDelete: "set null" }),
    targetSpecializationId: uuid("target_specialization_id").references(() => nodes.id, {
      onDelete: "set null",
    }),
    managerId: text("manager_id").references(() => user.id, { onDelete: "set null" }),
    // the person's colour theme (a name from src/design-system/tokens.ts, checked in the app); empty until they choose
    theme: text("theme"),
    ...timestamps,
  },
  (t) => [
    check("profiles_not_own_manager", sql`${t.managerId} is null or ${t.managerId} <> ${t.userId}`),
    check(
      "profiles_current_specialization_needs_role",
      sql`${t.currentSpecializationId} is null or ${t.currentRoleId} is not null`,
    ),
    check(
      "profiles_target_specialization_needs_role",
      sql`${t.targetSpecializationId} is null or ${t.targetRoleId} is not null`,
    ),
    index("profiles_manager_idx").on(t.managerId),
    index("profiles_practice_idx").on(t.practiceId),
  ],
);

/** Skills a person has and certifications they hold (with dates). Self-declared; no proficiency levels. */
export const profileItems = pgTable(
  "profile_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    // certifications only; expires_on is empty when the certification doesn't expire
    obtainedOn: date("obtained_on"),
    expiresOn: date("expires_on"),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.nodeId] }),
    check(
      "profile_items_expiry_after_obtained",
      sql`${t.expiresOn} is null or ${t.obtainedOn} is null or ${t.expiresOn} >= ${t.obtainedOn}`,
    ),
    index("profile_items_node_idx").on(t.nodeId),
  ],
);

/** A manager's development suggestion to a direct report: a target (role/specialisation) or an item to work on. */
export const recommendations = pgTable(
  "recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: text("person_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    comment: text("comment").notNull().default(""),
    status: recommendationStatus("status").notNull().default("open"),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check("recommendations_not_to_self", sql`${t.authorId} is null or ${t.authorId} <> ${t.personId}`),
    index("recommendations_person_status_idx").on(t.personId, t.status),
  ],
);

/** Feedback on a role or path, or a proposal for a new role or specialisation, reviewed by the practice's leads. */
export const changeRequests = pgTable(
  "change_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    practiceId: uuid("practice_id")
      .notNull()
      .references(() => practices.id, { onDelete: "cascade" }),
    // the role or specialisation it's about; empty for a new-role proposal
    roleId: uuid("role_id").references(() => nodes.id, { onDelete: "set null" }),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    status: changeRequestStatus("status").notNull().default("open"),
    reason: text("reason").notNull(),
    // list of operations, validated with zod (src/domain): add/update/remove requirement, add/remove path, …
    changes: jsonb("changes")
      .notNull()
      .default(sql`'[]'::jsonb`),
    decidedBy: text("decided_by").references(() => user.id, { onDelete: "set null" }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decisionNote: text("decision_note"),
    ...timestamps,
  },
  (t) => [
    index("change_requests_practice_status_idx").on(t.practiceId, t.status),
    index("change_requests_author_idx").on(t.authorId),
  ],
);

export const changeRequestComments = pgTable(
  "change_request_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => changeRequests.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("change_request_comments_request_idx").on(t.requestId)],
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
    // set when the change was applied by approving a change request
    changeRequestId: uuid("change_request_id").references(() => changeRequests.id, { onDelete: "set null" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_at_idx").on(t.at), index("audit_log_entity_idx").on(t.entity, t.entityId)],
);
