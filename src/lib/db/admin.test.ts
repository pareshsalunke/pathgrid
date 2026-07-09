import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { and, eq, sql } from "drizzle-orm";

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

suite("AI usage aggregation (Neon)", () => {
  let getDb: typeof import("./index").getDb;
  let schema: typeof import("./schema");
  let admin: typeof import("./admin");
  // Unique per run so assertions ignore any real ai_call rows in the shared DB.
  const feature = `__it_admin_${Math.floor(Math.random() * 1e9)}__`;

  beforeAll(async () => {
    ({ getDb } = await import("./index"));
    schema = await import("./schema");
    admin = await import("./admin");

    const call = (
      ok: boolean,
      inTokens: number,
      outTokens: number,
      ageDays: number,
    ) => ({
      name: "ai_call",
      props: { feature, ok, inTokens, outTokens },
      createdAt: sql`now() - make_interval(days => ${ageDays})`,
    });

    await getDb()
      .insert(schema.events)
      .values([
        call(true, 100, 40, 0), // today
        call(true, 200, 60, 0), // today
        call(false, 10, 0, 0), // today, a failure
        call(true, 5, 5, 1), // yesterday
        call(true, 999, 999, 40), // 40 days ago — outside the 30-day window
      ]);
  });

  afterAll(async () => {
    // Shared DB — remove only this run's marked rows.
    if (schema)
      await getDb()
        .delete(schema.events)
        .where(
          and(
            eq(schema.events.name, "ai_call"),
            sql`${schema.events.props}->>'feature' = ${feature}`,
          ),
        );
  });

  it("groups tokens/day per feature within the window, counting failures", async () => {
    const rows = (await admin.getAiUsageByDay(30)).filter(
      (r) => r.feature === feature,
    );

    // Two days present; the 40-day-old row is excluded by the window.
    expect(rows).toHaveLength(2);

    // Newest first → [today, yesterday].
    const [today, yesterday] = rows;
    expect(today).toMatchObject({
      calls: 3,
      failures: 1,
      inTokens: 310,
      outTokens: 100,
    });
    expect(yesterday).toMatchObject({
      calls: 1,
      failures: 0,
      inTokens: 5,
      outTokens: 5,
    });
  });
});
