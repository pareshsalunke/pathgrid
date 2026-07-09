import { describe, it, expect } from "vitest";
import { pool } from "./pool";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("pool", () => {
  it("returns results in input order", async () => {
    const out = await pool([3, 1, 2], 2, async (n) => {
      await sleep(n * 5); // slower items finish later, order must still hold
      return n * 10;
    });
    expect(out).toEqual([30, 10, 20]);
  });

  it("never runs more than `limit` workers at once", async () => {
    let active = 0;
    let peak = 0;
    await pool(
      Array.from({ length: 10 }, (_, i) => i),
      3,
      async () => {
        active += 1;
        peak = Math.max(peak, active);
        await sleep(5);
        active -= 1;
      },
    );
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1); // it did actually parallelize
  });

  it("propagates a worker failure", async () => {
    await expect(
      pool([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      }),
    ).rejects.toThrow("boom");
  });
});
