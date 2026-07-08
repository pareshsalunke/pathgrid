import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  bigserial,
  timestamp,
  jsonb,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { RoadmapGraph } from "@/lib/schemas/graph";
import type { TopicMeta, Seo } from "@/lib/schemas/content";

/**
 * Schema: content core (Phase 1) + accounts & persistence (Phase 2).
 * users/accounts/sessions/verification_tokens follow the @auth/drizzle-adapter
 * contract (adapter reads columns by their Drizzle key, so DB names may be snake_case).
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
export const progressStatus = pgEnum("progress_status", [
  "pending",
  "learning",
  "done",
  "skipped",
]);

// ── Auth.js (adapter) ──────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", {
    withTimezone: true,
    mode: "date",
  }),
  image: text("image"),
  avatarUrl: text("avatar_url"), // legacy column, unused (adapter writes `image`)
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ── Content core ───────────────────────────────────────────────────

export const roadmaps = pgTable("roadmaps", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique(), // null for private user roadmaps
  title: text("title").notNull(),
  brief: text("brief"),
  category: roadmapCategory("category").notNull(),
  kind: roadmapKind("kind").notNull().default("roadmap"),
  ownerId: uuid("owner_id").references(() => users.id, {
    onDelete: "cascade",
  }), // null = official; cascades on account delete (GDPR)
  visibility: roadmapVisibility("visibility").notNull().default("public"),
  isAiGenerated: boolean("is_ai_generated").default(false),
  seo: jsonb("seo").$type<Seo>(),
  currentVersionId: uuid("current_version_id"),
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
    nodeId: text("node_id").notNull(),
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

// ── Accounts & persistence ─────────────────────────────────────────

export const userTopicProgress = pgTable(
  "user_topic_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roadmapId: uuid("roadmap_id")
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),
    status: progressStatus("status").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roadmapId, t.nodeId] })],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roadmapId: uuid("roadmap_id")
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roadmapId] })],
);

export const events = pgTable("events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: uuid("user_id"),
  anonId: text("anon_id"),
  name: text("name").notNull(),
  props: jsonb("props"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
