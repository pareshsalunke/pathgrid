import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let client: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** Lazily construct the Drizzle client so a missing DATABASE_URL never crashes
 *  builds or pages that don't touch the DB. All DB access goes through here
 *  (no queries in components — see CLAUDE.md conventions). */
export function getDb() {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — configure it in .env (see .env.example).",
    );
  }
  client = drizzle(neon(url), { schema });
  return client;
}
