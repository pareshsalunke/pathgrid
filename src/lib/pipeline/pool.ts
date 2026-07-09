/**
 * Tiny ordered concurrency pool for the per-topic pipeline steps (content, resources,
 * quiz). Deviation from doc 06 §2's provider Batch APIs: a ~4-wide pool over the
 * regular SDK reuses the existing generation code and is plenty for a 6-roadmap
 * catalog (DECISIONS.md, Phase 4). Results keep the input order; a worker failure
 * rejects the whole pool (steps are resumable, so retries are cheap).
 */
export async function pool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    },
  );
  await Promise.all(workers);
  return results;
}
