CREATE TYPE "public"."resource_kind" AS ENUM('article', 'video', 'docs', 'course', 'book');--> statement-breakpoint
CREATE TYPE "public"."resource_status" AS ENUM('unverified', 'verified', 'dead');--> statement-breakpoint
CREATE TYPE "public"."roadmap_category" AS ENUM('role', 'skill', 'custom');--> statement-breakpoint
CREATE TYPE "public"."roadmap_kind" AS ENUM('roadmap', 'best_practice', 'project_set');--> statement-breakpoint
CREATE TYPE "public"."roadmap_visibility" AS ENUM('public', 'unlisted', 'private');--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"kind" "resource_kind" NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"is_paid" boolean DEFAULT false,
	"position" integer DEFAULT 0,
	"status" "resource_status" DEFAULT 'unverified'
);
--> statement-breakpoint
CREATE TABLE "roadmap_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"graph" jsonb NOT NULL,
	"version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text,
	"title" text NOT NULL,
	"brief" text,
	"category" "roadmap_category" NOT NULL,
	"kind" "roadmap_kind" DEFAULT 'roadmap' NOT NULL,
	"owner_id" uuid,
	"visibility" "roadmap_visibility" DEFAULT 'public' NOT NULL,
	"is_ai_generated" boolean DEFAULT false,
	"seo" jsonb,
	"current_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roadmaps_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"node_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body_md" text,
	"meta" jsonb,
	CONSTRAINT "topics_roadmap_node_unique" UNIQUE("roadmap_id","node_id"),
	CONSTRAINT "topics_roadmap_slug_unique" UNIQUE("roadmap_id","slug")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_versions" ADD CONSTRAINT "roadmap_versions_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE cascade ON UPDATE no action;