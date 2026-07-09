import { sql } from "drizzle-orm";
import { getDb } from "./index";

/**
 * Admin usage aggregation for /admin/ai (docs/08 Phase 3: "tokens/day per feature,
 * powered by the events log"). Reads the `ai_call` events every AI route logs
 * (`{feature, provider, model, inTokens, outTokens, latencyMs, ok, code?}`) — never a
 * key, which is never in `props`. Grouped by UTC day + feature over a bounded window.
 */

export type AiUsageRow = {
  day: string; // 'YYYY-MM-DD' (UTC)
  feature: string; // roadmap | chat | chat_summary | quiz | …
  calls: number;
  failures: number;
  inTokens: number;
  outTokens: number;
};

type RawUsageRow = {
  day: string;
  feature: string | null;
  calls: string | number;
  failures: string | number;
  in_tokens: string | number;
  out_tokens: string | number;
};

/** Tokens/day per feature over the last `days` days, newest first. */
export async function getAiUsageByDay(days = 30): Promise<AiUsageRow[]> {
  const result = await getDb().execute(sql`
    select
      to_char((created_at at time zone 'UTC')::date, 'YYYY-MM-DD') as day,
      props->>'feature' as feature,
      count(*) as calls,
      count(*) filter (where props->>'ok' = 'false') as failures,
      coalesce(sum((props->>'inTokens')::bigint), 0) as in_tokens,
      coalesce(sum((props->>'outTokens')::bigint), 0) as out_tokens
    from events
    where name = 'ai_call'
      and created_at >= now() - make_interval(days => ${days})
    group by day, feature
    order by day desc, feature asc
  `);

  return (result.rows as RawUsageRow[]).map((r) => ({
    day: r.day,
    feature: r.feature ?? "unknown",
    calls: Number(r.calls),
    failures: Number(r.failures),
    inTokens: Number(r.in_tokens),
    outTokens: Number(r.out_tokens),
  }));
}
