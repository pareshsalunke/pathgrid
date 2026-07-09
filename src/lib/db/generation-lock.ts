import { eq, sql } from "drizzle-orm";
import { getDb } from "./index";
import { generationLocks } from "./schema";

/**
 * Per-user generation lock (docs/05 §4: "a lock so one user can't run parallel
 * generations"). Backs the roadmap route's in-flight guard. neon-http has no session
 * advisory locks or multi-statement transactions, so acquisition is a single atomic
 * upsert; a lock older than the stale TTL is reclaimable so a crashed generation never
 * wedges the user out (the roadmap route runs at maxDuration=300 = 5 min).
 */

/**
 * Try to claim the lock for `userId`. One atomic statement:
 *  - no existing row    → INSERT                         → row returned → true
 *  - row older than TTL → DO UPDATE (setWhere true)      → row returned → true (takeover)
 *  - active row         → DO UPDATE skipped (setWhere false) → no row   → false
 *
 * The 5-minute TTL sits just over the roadmap route's maxDuration (300s) so a live
 * generation is never reclaimed, but a crashed one always is.
 */
export async function acquireGenerationLock(
  userId: string,
  kind = "roadmap",
): Promise<boolean> {
  const rows = await getDb()
    .insert(generationLocks)
    .values({ userId, kind })
    .onConflictDoUpdate({
      target: generationLocks.userId,
      set: { kind, startedAt: sql`now()` },
      setWhere: sql`${generationLocks.startedAt} < now() - interval '5 minutes'`,
    })
    .returning({ userId: generationLocks.userId });
  return rows.length > 0;
}

/** Release the lock. Best-effort: the stale TTL is the backstop if this never runs. */
export async function releaseGenerationLock(userId: string): Promise<void> {
  await getDb()
    .delete(generationLocks)
    .where(eq(generationLocks.userId, userId));
}
