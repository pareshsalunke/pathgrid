import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({ env: { revalidateSecret: "" } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { env } from "@/lib/env";
import { revalidatePath } from "next/cache";
import { POST } from "./route";

const revalidateMock = vi.mocked(revalidatePath);

function request(body: unknown): Request {
  return new Request("http://localhost/api/revalidate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  env.revalidateSecret = "s3cret";
});

describe("POST /api/revalidate", () => {
  it("503 when no secret is configured (endpoint disabled)", async () => {
    env.revalidateSecret = "";
    const res = await POST(request({ secret: "x", slug: "a" }));
    expect(res.status).toBe(503);
    expect(revalidateMock).not.toHaveBeenCalled();
  });

  it("400 on a malformed body or slug", async () => {
    expect((await POST(request({ secret: "s3cret" }))).status).toBe(400);
    expect(
      (await POST(request({ secret: "s3cret", slug: "Bad Slug!" }))).status,
    ).toBe(400);
    expect(revalidateMock).not.toHaveBeenCalled();
  });

  it("401 on a wrong secret", async () => {
    const res = await POST(
      request({ secret: "wrong", slug: "product-manager" }),
    );
    expect(res.status).toBe(401);
    expect(revalidateMock).not.toHaveBeenCalled();
  });

  it("revalidates home, the roadmap page, and the sitemap on the right secret", async () => {
    const res = await POST(
      request({ secret: "s3cret", slug: "product-manager" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, slug: "product-manager" });
    expect(revalidateMock.mock.calls.map((c) => c[0])).toEqual([
      "/",
      "/product-manager",
      "/sitemap.xml",
    ]);
  });
});
