CREATE TYPE "public"."app_role" AS ENUM('employee', 'manager', 'admin');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete');--> statement-breakpoint
CREATE TYPE "public"."audit_entity" AS ENUM('node', 'edge', 'profile', 'app_role');--> statement-breakpoint
CREATE TYPE "public"."edge_kind" AS ENUM('requires', 'builds_on', 'related_to', 'next_step');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('role', 'skill', 'technology');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('critical', 'important', 'nice');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"action" "audit_action" NOT NULL,
	"entity" "audit_entity" NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "edge_kind" NOT NULL,
	"source_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"priority" "priority",
	"strength" smallint DEFAULT 3 NOT NULL,
	"external_id" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "edges_kind_source_target_unique" UNIQUE("kind","source_id","target_id"),
	CONSTRAINT "edges_source_external_id_unique" UNIQUE("source","external_id"),
	CONSTRAINT "edges_no_self_loop" CHECK ("edges"."source_id" <> "edges"."target_id"),
	CONSTRAINT "edges_priority_only_on_requires" CHECK (("edges"."kind" = 'requires') = ("edges"."priority" is not null)),
	CONSTRAINT "edges_strength_range" CHECK ("edges"."strength" between 1 and 5),
	CONSTRAINT "edges_related_to_ordered" CHECK ("edges"."kind" <> 'related_to' or "edges"."source_id" < "edges"."target_id")
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
	"external_id" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nodes_slug_unique" UNIQUE("slug"),
	CONSTRAINT "nodes_normalized_name_unique" UNIQUE("normalized_name"),
	CONSTRAINT "nodes_source_external_id_unique" UNIQUE("source","external_id")
);
--> statement-breakpoint
CREATE TABLE "profile_skills" (
	"user_id" text NOT NULL,
	"node_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_skills_user_id_node_id_pk" PRIMARY KEY("user_id","node_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"app_role" "app_role" DEFAULT 'employee' NOT NULL,
	"current_role_id" uuid,
	"manager_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_not_own_manager" CHECK ("profiles"."manager_id" is null or "profiles"."manager_id" <> "profiles"."user_id")
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
ALTER TABLE "edges" ADD CONSTRAINT "edges_source_id_nodes_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_target_id_nodes_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_skills" ADD CONSTRAINT "profile_skills_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_skills" ADD CONSTRAINT "profile_skills_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_current_role_id_nodes_id_fk" FOREIGN KEY ("current_role_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_manager_id_user_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "edges_source_idx" ON "edges" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "edges_target_idx" ON "edges" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "edges_kind_idx" ON "edges" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "nodes_type_idx" ON "nodes" USING btree ("type");--> statement-breakpoint
CREATE INDEX "profile_skills_node_idx" ON "profile_skills" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "profiles_manager_idx" ON "profiles" USING btree ("manager_id");