import { getDb } from "./db";
import { events } from "./db/schema";

/**
 * Record one analytics event (docs/04 §2 events table). Best-effort: analytics must
 * never break the request it's instrumenting, so failures are swallowed.
 */
export async function track(
  name: string,
  props?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  try {
    await getDb()
      .insert(events)
      .values({ name, props: props ?? null, userId: userId ?? null });
  } catch (err) {
    console.error(`track(${name}) failed`, err);
  }
}
