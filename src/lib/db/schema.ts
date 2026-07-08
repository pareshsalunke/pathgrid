import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

/** Minimal starter table so migrations have something to generate. The full
 *  schema (roadmaps, roadmap_versions, topics, resources, progress, events)
 *  lands in Phase 1 per docs/04 §2. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
