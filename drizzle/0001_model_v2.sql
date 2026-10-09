-- Model v2 (docs/PLAN.md §3): sites, practices, specialisations, three catalogue types, certifications,
-- recommendations and change requests. v1 held only seed data and no real people, so the schema is rebuilt
-- rather than altered; `pnpm db:seed` adds the v2 graph right after this migration (see vercel.json).
DROP TABLE IF EXISTS "audit_log", "profile_skills", "profiles", "edges", "nodes", "user" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "app_role", "audit_action", "audit_entity", "edge_kind", "node_type", "priority";--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete');--> statement-breakpoint
CREATE TYPE "public"."audit_entity" AS ENUM('site', 'practice', 'node', 'edge', 'profile', 'profile_item', 'recommendation', 'change_request', 'access');--> statement-breakpoint
CREATE TYPE "public"."change_request_status" AS ENUM('open', 'needs_info', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."edge_kind" AS ENUM('requires', 'builds_on', 'related_to', 'next_step');--> statement-breakpoint
CREATE TYPE "public"."node_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('role', 'specialization', 'technical_skill', 'soft_skill', 'certification');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('critical', 'important', 'nice');--> statement-breakpoint
CREATE TYPE "public"."recommendation_status" AS ENUM('open', 'accepted', 'declined');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"action" "audit_action" NOT NULL,
	"entity" "audit_entity" NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"change_request_id" uuid,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_request_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"author_id" text,
	"body" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"practice_id" uuid NOT NULL,
	"role_id" uuid,
	"author_id" text,
	"status" "change_request_status" DEFAULT 'open' NOT NULL,
	"reason" text NOT NULL,
	"changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "edge_kind" NOT NULL,
	"source_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"priority" "priority",
	"strength" smallint DEFAULT 3 NOT NULL,
	"note" text,
	"typical_months" smallint,
	"external_id" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "edges_kind_source_target_unique" UNIQUE("kind","source_id","target_id"),
	CONSTRAINT "edges_source_external_id_unique" UNIQUE("source","external_id"),
	CONSTRAINT "edges_no_self_loop" CHECK ("edges"."source_id" <> "edges"."target_id"),
	CONSTRAINT "edges_priority_only_on_requires" CHECK (("edges"."kind" = 'requires') = ("edges"."priority" is not null)),
	CONSTRAINT "edges_strength_range" CHECK ("edges"."strength" between 1 and 5),
	CONSTRAINT "edges_related_to_ordered" CHECK ("edges"."kind" <> 'related_to' or "edges"."source_id" < "edges"."target_id"),
	CONSTRAINT "edges_typical_months_only_on_paths" CHECK ("edges"."typical_months" is null or ("edges"."kind" = 'next_step' and "edges"."typical_months" > 0))
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "node_type" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"normalized_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "node_status" DEFAULT 'published' NOT NULL,
	"practice_id" uuid,
	"parent_role_id" uuid,
	"issuer" text,
	"external_id" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nodes_slug_unique" UNIQUE("slug"),
	CONSTRAINT "nodes_specialization_name_unique" UNIQUE("parent_role_id","normalized_name"),
	CONSTRAINT "nodes_source_external_id_unique" UNIQUE("source","external_id"),
	CONSTRAINT "nodes_role_has_practice" CHECK (("nodes"."type" = 'role') = ("nodes"."practice_id" is not null)),
	CONSTRAINT "nodes_specialization_has_role" CHECK (("nodes"."type" = 'specialization') = ("nodes"."parent_role_id" is not null)),
	CONSTRAINT "nodes_issuer_only_on_certifications" CHECK ("nodes"."issuer" is null or "nodes"."type" = 'certification')
);
--> statement-breakpoint
CREATE TABLE "practice_leads" (
	"practice_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "practice_leads_practice_id_user_id_pk" PRIMARY KEY("practice_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "practices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practices_slug_unique" UNIQUE("slug"),
	CONSTRAINT "practices_site_name_unique" UNIQUE("site_id","name")
);
--> statement-breakpoint
CREATE TABLE "profile_items" (
	"user_id" text NOT NULL,
	"node_id" uuid NOT NULL,
	"obtained_on" date,
	"expires_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_items_user_id_node_id_pk" PRIMARY KEY("user_id","node_id"),
	CONSTRAINT "profile_items_expiry_after_obtained" CHECK ("profile_items"."expires_on" is null or "profile_items"."obtained_on" is null or "profile_items"."expires_on" >= "profile_items"."obtained_on")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"practice_id" uuid,
	"current_role_id" uuid,
	"current_specialization_id" uuid,
	"target_role_id" uuid,
	"target_specialization_id" uuid,
	"manager_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_not_own_manager" CHECK ("profiles"."manager_id" is null or "profiles"."manager_id" <> "profiles"."user_id"),
	CONSTRAINT "profiles_current_specialization_needs_role" CHECK ("profiles"."current_specialization_id" is null or "profiles"."current_role_id" is not null),
	CONSTRAINT "profiles_target_specialization_needs_role" CHECK ("profiles"."target_specialization_id" is null or "profiles"."target_role_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" text NOT NULL,
	"author_id" text,
	"node_id" uuid NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"status" "recommendation_status" DEFAULT 'open' NOT NULL,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recommendations_not_to_self" CHECK ("recommendations"."author_id" is null or "recommendations"."author_id" <> "recommendations"."person_id")
);
--> statement-breakpoint
CREATE TABLE "site_leads" (
	"site_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "site_leads_site_id_user_id_pk" PRIMARY KEY("site_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sites_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_change_request_id_change_requests_id_fk" FOREIGN KEY ("change_request_id") REFERENCES "public"."change_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_request_comments" ADD CONSTRAINT "change_request_comments_request_id_change_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."change_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_request_comments" ADD CONSTRAINT "change_request_comments_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_role_id_nodes_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_source_id_nodes_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_target_id_nodes_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_parent_role_id_nodes_id_fk" FOREIGN KEY ("parent_role_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_leads" ADD CONSTRAINT "practice_leads_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_leads" ADD CONSTRAINT "practice_leads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practices" ADD CONSTRAINT "practices_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_items" ADD CONSTRAINT "profile_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_items" ADD CONSTRAINT "profile_items_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_current_role_id_nodes_id_fk" FOREIGN KEY ("current_role_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_current_specialization_id_nodes_id_fk" FOREIGN KEY ("current_specialization_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_target_role_id_nodes_id_fk" FOREIGN KEY ("target_role_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_target_specialization_id_nodes_id_fk" FOREIGN KEY ("target_specialization_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_manager_id_user_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_person_id_user_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_leads" ADD CONSTRAINT "site_leads_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_leads" ADD CONSTRAINT "site_leads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "change_request_comments_request_idx" ON "change_request_comments" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "change_requests_practice_status_idx" ON "change_requests" USING btree ("practice_id","status");--> statement-breakpoint
CREATE INDEX "change_requests_author_idx" ON "change_requests" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "edges_source_idx" ON "edges" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "edges_target_idx" ON "edges" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "edges_kind_idx" ON "edges" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "nodes_normalized_name_unique" ON "nodes" USING btree ("normalized_name") WHERE "nodes"."type" <> 'specialization';--> statement-breakpoint
CREATE INDEX "nodes_type_idx" ON "nodes" USING btree ("type");--> statement-breakpoint
CREATE INDEX "nodes_practice_idx" ON "nodes" USING btree ("practice_id");--> statement-breakpoint
CREATE INDEX "nodes_parent_role_idx" ON "nodes" USING btree ("parent_role_id");--> statement-breakpoint
CREATE INDEX "practice_leads_user_idx" ON "practice_leads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profile_items_node_idx" ON "profile_items" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "profiles_manager_idx" ON "profiles" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "profiles_practice_idx" ON "profiles" USING btree ("practice_id");--> statement-breakpoint
CREATE INDEX "recommendations_person_status_idx" ON "recommendations" USING btree ("person_id","status");--> statement-breakpoint
CREATE INDEX "site_leads_user_idx" ON "site_leads" USING btree ("user_id");