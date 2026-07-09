import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { aiDisabled: false } }));
vi.mock("@/lib/ai/registry", () => ({
  resolveProviderConfig: vi.fn(),
  getModel: vi.fn(() => ({})),
}));
vi.mock("ai", () => ({ generateText: vi.fn() }));
vi.mock("@/lib/track", () => ({ track: vi.fn(async () => {}) }));

import { auth } from "@/auth";
import { env } from "@/lib/env";
import { resolveProviderConfig } from "@/lib/ai/registry";
import { generateText } from "ai";
import { POST } from "./route";

const authMock = vi.mocked(auth);
const resolveMock = vi.mocked(resolveProviderConfig);
const genMock = vi.mocked(generateText);

const providerConfig = {
  provider: "anthropic" as const,
  apiKey: "sk-ant-x",
  models: { smart: "s", fast: "f" },
};

function request(): Request {
  return new Request("http://localhost/api/ai/test-key", {
    method: "POST",
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  env.aiDisabled = false;
  authMock.mockResolvedValue({ user: { id: "u1" } } as never);
  resolveMock.mockReturnValue(providerConfig);
});

describe("POST /api/ai/test-key", () => {
  it("401 when signed out", async () => {
    authMock.mockResolvedValue(null as never);
    const res = await POST(request());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(genMock).not.toHaveBeenCalled();
  });

  it("503 ai_disabled when the kill switch is on", async () => {
    env.aiDisabled = true;
    const res = await POST(request());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "ai_disabled" });
    expect(genMock).not.toHaveBeenCalled();
  });

  it("400 no_provider_key without BYOK headers", async () => {
    resolveMock.mockReturnValue(null);
    const res = await POST(request());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "no_provider_key" });
    expect(genMock).not.toHaveBeenCalled();
  });

  it("maps a provider error to an actionable code, never leaking the key", async () => {
    genMock.mockRejectedValue(
      Object.assign(new Error("bad key"), { statusCode: 401 }),
    );
    const res = await POST(request());
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, code: "invalid_key" });
    expect(typeof body.message).toBe("string");
    expect(JSON.stringify(body)).not.toContain("sk-ant-x");
  });

  it("returns ok:true on a successful ping", async () => {
    genMock.mockResolvedValue({} as never);
    const res = await POST(request());
    expect(await res.json()).toEqual({ ok: true, provider: "anthropic" });
  });
});
