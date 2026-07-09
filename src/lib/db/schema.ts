import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  bigint,
  bigserial,
  timestamp,
  jsonb,
  unique,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import type { RoadmapGraph } from "@/lib/schemas/graph";
import type { TopicMeta, Seo } from "@/lib/schemas/content";
import type { QuizQuestion } from "@/lib/schemas/quiz";

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
export const generatedKind = pgEnum("generated_kind", [
  "roadmap",
  "plan",
  "quiz",
  "guide",
]);
export const chatRole = pgEnum("chat_role", ["user", "assistant"]);

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

// ── AI runtime (Phase 3) ───────────────────────────────────────────

/** Everything a user generates in the AI hub (doc 04 §2). For kind='roadmap',
 *  payloadRef points at roadmaps.id (plain uuid per the doc DDL — the roadmap
 *  row already cascades via ownerId); quiz/plan payloads inline in `payload`. */
export const generatedItems = pgTable("generated_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: generatedKind("kind").notNull(),
  title: text("title").notNull(),
  payloadRef: uuid("payload_ref"),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Tutor chat (doc 04 §2). roadmapId null = general tutor; SET NULL (not the doc's
 *  default NO ACTION) so deleting a roadmap owner's account never blocks the GDPR
 *  users-cascade — the thread degrades to general tutor. summary/summaryUpto hold a
 *  rolling summary of turns older than the ~20-message context window (summaryUpto =
 *  last chat_messages.id folded into the summary). */
export const chatThreads = pgTable(
  "chat_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roadmapId: uuid("roadmap_id").references(() => roadmaps.id, {
      onDelete: "set null",
    }),
    title: text("title"),
    summary: text("summary"),
    summaryUpto: bigint("summary_upto", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("chat_threads_user_idx").on(t.userId)],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),
    role: chatRole("role").notNull(),
    content: text("content").notNull(),
    // Per-turn cost split: user rows carry the call's inputTokens, assistant rows
    // its outputTokens — SUM(tokens) over a thread = what the user actually paid.
    tokens: integer("tokens"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("chat_messages_thread_id_idx").on(t.threadId, t.id)],
);

/** Cached per-topic quizzes (doc 04 §2, doc 06 §3.5). Keyed by (roadmapId, nodeId)
 *  rather than the doc's `topic_id` FK: the drawer only ever knows a graph nodeId, and
 *  generated maps have no `topics` rows at all — this addressing works identically for
 *  official and generated maps (DECISIONS.md). roadmapId cascade drops a map's quizzes on
 *  roadmap/owner delete; the unique key is the cache lookup. `model` = authoring provenance
 *  (doc 06 §4.5). questions holds the full [{q,options[4],answerIdx,why}] — answers are
 *  stripped before leaving the quiz route. */
export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roadmapId: uuid("roadmap_id")
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),
    questions: jsonb("questions").$type<QuizQuestion[]>().notNull(),
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique("quizzes_roadmap_node_unique").on(t.roadmapId, t.nodeId)],
);

/** A graded quiz attempt (doc 04 §2). Both FKs cascade (deviation from the doc's bare
 *  `quiz_id` FK): user delete is the GDPR path; quiz delete (via a roadmap delete) must not
 *  leave dangling attempts. answers = the learner's selected option index per question. */
export const quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  quizId: uuid("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  answers: jsonb("answers").$type<number[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

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

/**
 * Per-user generation lock (Phase 3 item 7; docs/05 §4 "a lock so one user can't run
 * parallel generations"). One row = one in-flight long generation. The roadmap route
 * (maxDuration=300) acquires atomically and releases in `finally`; a row older than the
 * stale TTL is reclaimable so a crashed run never wedges the user out. `kind` is
 * future-proofed for other long generations (currently only 'roadmap').
 */
export const generationLocks = pgTable("generation_locks", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
