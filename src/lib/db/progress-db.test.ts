import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";

// Load DATABASE_URL from .env so `pnpm test` can round-trip against Neon.
// If it's unavailable (e.g. CI without secrets), the suite skips.
if (!process.env.DATABASE_URL) {
  try {
    const line = readFileSync(".env", "utf8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="));
    if (line)
      process.env.DATABASE_URL = line.slice("DATABASE_URL=".length).trim();
  } catch {
    /* no .env — skip */
  }
}

const suite = process.env.DATABASE_URL ? describe : describe.skip;

suite("progress persistence (Neon)", () => {
  let getDb: typeof import("./index").getDb;
  let users: typeof import("./schema").users;
  let roadmaps: typeof import("./schema").roadmaps;
  let progress: typeof import("./progress");
  let userId: string;
  let roadmapId: string;

  beforeAll(async () => {
    ({ getDb } = await import("./index"));
    ({ users, roadmaps } = await import("./schema"));
    progress = await import("./progress");

    const [u] = await getDb()
      .insert(users)
      .values({
        email: `it-${Math.floor(Math.random() * 1e9)}@example.com`,
        name: "IT User",
      })
      .returning({ id: users.id });
    userId = u.id;

    const [rm] = await getDb()
      .select({ id: roadmaps.id })
      .from(roadmaps)
      .where(eq(roadmaps.slug, "frontend-developer"))
      .limit(1);
    roadmapId = rm.id;
  });

  afterAll(async () => {
    if (userId) await getDb().delete(users).where(eq(users.id, userId));
  });

  it("round-trips a progress write", async () => {
    await progress.putUserProgress(userId, roadmapId, {
      html: "done",
      css: "learning",
    });
    const got = await progress.getUserProgress(userId, roadmapId);
    expect(got.html).toBe("done");
    expect(got.css).toBe("learning");
  });

  it("merges without downgrading done", async () => {
    // html already "done"; merging "pending" must keep it, and add a new node.
    await progress.mergeUserProgress(userId, {
      [roadmapId]: { html: "pending", javascript: "done" },
    });
    const got = await progress.getUserProgress(userId, roadmapId);
    expect(got.html).toBe("done");
    expect(got.javascript).toBe("done");
  });
});
