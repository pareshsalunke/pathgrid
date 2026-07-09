CREATE TYPE "public"."generated_kind" AS ENUM('roadmap', 'plan', 'quiz', 'guide');--> statement-breakpoint
CREATE TABLE "generated_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "generated_kind" NOT NULL,
	"title" text NOT NULL,
	"payload_ref" uuid,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generated_items" ADD CONSTRAINT "generated_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;