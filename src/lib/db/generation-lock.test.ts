import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";

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

suite("generation lock (Neon)", () => {
  let getDb: typeof import("./index").getDb;
  let schema: typeof import("./schema");
  let lock: typeof import("./generation-lock");
  let userId: string;

  beforeAll(async () => {
    ({ getDb } = await import("./index"));
    schema = await import("./schema");
    lock = await import("./generation-lock");

    const [u] = await getDb()
      .insert(schema.users)
      .values({
        email: `it-lock-${Math.floor(Math.random() * 1e9)}@example.com`,
        name: "IT Lock User",
      })
      .returning({ id: schema.users.id });
    userId = u.id;
  });

  afterAll(async () => {
    // Deleting the user cascades the lock row.
    if (userId)
      await getDb().delete(schema.users).where(eq(schema.users.id, userId));
  });

  it("acquires when free, refuses a second acquire, frees on release", async () => {
    expect(await lock.acquireGenerationLock(userId)).toBe(true);
    expect(await lock.acquireGenerationLock(userId)).toBe(false); // already held
    await lock.releaseGenerationLock(userId);
    expect(await lock.acquireGenerationLock(userId)).toBe(true); // free again
    await lock.releaseGenerationLock(userId); // leave clean for the next test
  });

  it("reclaims a stale lock past the TTL and refreshes it", async () => {
    expect(await lock.acquireGenerationLock(userId)).toBe(true);
    expect(await lock.acquireGenerationLock(userId)).toBe(false);

    // Age the row past the 5-minute TTL — simulates a crashed generation.
    await getDb()
      .update(schema.generationLocks)
      .set({ startedAt: sql`now() - interval '6 minutes'` })
      .where(eq(schema.generationLocks.userId, userId));

    expect(await lock.acquireGenerationLock(userId)).toBe(true); // takeover
    // The takeover reset started_at → the row is fresh and held again.
    expect(await lock.acquireGenerationLock(userId)).toBe(false);

    await lock.releaseGenerationLock(userId);
  });
});
