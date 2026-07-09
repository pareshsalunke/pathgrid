import { describe, it, expect, vi } from "vitest";
import { verifyUrl } from "./verify-url";

type FetchMock = ReturnType<typeof vi.fn> & typeof fetch;

function fetchReturning(...responses: Array<{ ok: boolean; status: number }>) {
  const fn = vi.fn();
  for (const r of responses) fn.mockResolvedValueOnce(r as Response);
  return fn as FetchMock;
}

describe("verifyUrl (Policy A link check)", () => {
  it("passes on a 2xx HEAD without a GET fallback", async () => {
    const f = fetchReturning({ ok: true, status: 200 });
    expect(await verifyUrl("https://example.com/docs", f)).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][1]).toMatchObject({ method: "HEAD" });
  });

  it("fails on a 404 without retrying", async () => {
    const f = fetchReturning({ ok: false, status: 404 });
    expect(await verifyUrl("https://example.com/gone", f)).toBe(false);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("retries HEAD-rejecting hosts (405) as GET and passes on 200", async () => {
    const f = fetchReturning(
      { ok: false, status: 405 },
      { ok: true, status: 200 },
    );
    expect(await verifyUrl("https://example.com/no-head", f)).toBe(true);
    expect(f).toHaveBeenCalledTimes(2);
    expect(f.mock.calls[1][1]).toMatchObject({ method: "GET" });
  });

  it("fails when the GET fallback also errors", async () => {
    const f = fetchReturning(
      { ok: false, status: 403 },
      { ok: false, status: 500 },
    );
    expect(await verifyUrl("https://example.com/blocked", f)).toBe(false);
  });

  it("fails closed on network errors / timeouts", async () => {
    const f = vi.fn().mockRejectedValue(new Error("timeout")) as FetchMock;
    expect(await verifyUrl("https://example.com/slow", f)).toBe(false);
  });
});
