import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import type { RoadmapGraph } from "@/lib/schemas/graph";
import type { TopicMeta, Seo } from "@/lib/schemas/content";

/**
 * Phase 1 schema (docs/04 §2): users + the content core
 * (roadmaps, roadmap_versions, topics, resources).
 * Accounts/progress/bookmarks tables arrive in Phase 2.
 */

export const roadmapCategory = pgEnum("roadmap_category", [
  "role",
  "skill",
  "custom",
]);
export const roadmapKind = pgEnum("roadmap_kind", [
  "roadmap",
  "best_practice",
  "project_set",
]);
export const roadmapVisibility = pgEnum("roadmap_visibility", [
  "public",
  "unlisted",
  "private",
]);
export const resourceKind = pgEnum("resource_kind", [
  "article",
  "video",
  "docs",
  "course",
  "book",
]);
export const resourceStatus = pgEnum("resource_status", [
  "unverified",
  "verified",
  "dead",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const roadmaps = pgTable("roadmaps", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique(), // null for private user roadmaps
  title: text("title").notNull(),
  brief: text("brief"),
  category: roadmapCategory("category").notNull(),
  kind: roadmapKind("kind").notNull().default("roadmap"),
  ownerId: uuid("owner_id").references(() => users.id), // null = official
  visibility: roadmapVisibility("visibility").notNull().default("public"),
  isAiGenerated: boolean("is_ai_generated").default(false),
  seo: jsonb("seo").$type<Seo>(),
  currentVersionId: uuid("current_version_id"), // set after version insert (no circular FK)
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const roadmapVersions = pgTable("roadmap_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  roadmapId: uuid("roadmap_id")
    .notNull()
    .references(() => roadmaps.id, { onDelete: "cascade" }),
  graph: jsonb("graph").$type<RoadmapGraph>().notNull(),
  version: integer("version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roadmapId: uuid("roadmap_id")
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(), // matches graph node id
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    bodyMd: text("body_md"),
    meta: jsonb("meta").$type<TopicMeta>(),
  },
  (t) => [
    unique("topics_roadmap_node_unique").on(t.roadmapId, t.nodeId),
    unique("topics_roadmap_slug_unique").on(t.roadmapId, t.slug),
  ],
);

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  kind: resourceKind("kind").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  isPaid: boolean("is_paid").default(false),
  position: integer("position").default(0),
  status: resourceStatus("status").default("unverified"),
});
