import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { aiDisabled: false } }));
vi.mock("@/lib/ai/registry", () => ({ resolveProviderConfig: vi.fn() }));
vi.mock("@/lib/ai/subtopics", () => ({
  generateSubtopics: vi.fn(),
  StructuredOutputError: class StructuredOutputError extends Error {
    usage: unknown;
    constructor(message: string, _issues: string[], usage: unknown) {
      super(message);
      this.name = "StructuredOutputError";
      this.usage = usage;
    }
  },
}));
vi.mock("@/lib/track", () => ({ track: vi.fn(async () => {}) }));

import { auth } from "@/auth";
import { env } from "@/lib/env";
import { resolveProviderConfig } from "@/lib/ai/registry";
import { generateSubtopics, StructuredOutputError } from "@/lib/ai/subtopics";
import { track } from "@/lib/track";
import { POST } from "./route";

const authMock = vi.mocked(auth);
const resolveMock = vi.mocked(resolveProviderConfig);
const generateMock = vi.mocked(generateSubtopics);
const trackMock = vi.mocked(track);

const USER_ID = "3f8b8f60-0f4b-4d5f-9d5c-000000000000";

const providerConfig = {
  provider: "anthropic" as const,
  apiKey: "sk-ant-x",
  models: { smart: "s", fast: "f" },
};

function post(body: unknown) {
  return new Request("http://localhost/api/ai/subtopics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  roadmapTitle: "Frontend Developer",
  parentLabel: "CSS Layout",
  existingChildren: ["Flexbox"],
};

beforeEach(() => {
  vi.clearAllMocks();
  env.aiDisabled = false;
  authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
  resolveMock.mockReturnValue(providerConfig);
  generateMock.mockResolvedValue({
    subtopics: ["Box model", "Positioning", "Grid"],
    usage: { inputTokens: 12, outputTokens: 8, calls: 1 },
    repaired: false,
  } as never);
});

describe("POST /api/ai/subtopics — guards", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null as never);
    expect((await POST(post(validBody))).status).toBe(401);
  });

  it("503 when AI is disabled", async () => {
    env.aiDisabled = true;
    expect((await POST(post(validBody))).status).toBe(503);
  });

  it("400 no_provider_key when the key is missing", async () => {
    resolveMock.mockReturnValue(null);
    const res = await POST(post(validBody));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("no_provider_key");
  });

  it("400 invalid_body on a malformed payload", async () => {
    const res = await POST(post({ roadmapTitle: "x" })); // missing parentLabel
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_body");
  });
});

describe("POST /api/ai/subtopics — generation", () => {
  it("returns subtopics + usage and logs the call (no DB access)", async () => {
    const res = await POST(post(validBody));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.subtopics).toEqual(["Box model", "Positioning", "Grid"]);
    expect(data.usage).toEqual({ inputTokens: 12, outputTokens: 8 });

    expect(generateMock).toHaveBeenCalledWith({
      config: providerConfig,
      roadmapTitle: "Frontend Developer",
      parentLabel: "CSS Layout",
      existingChildren: ["Flexbox"],
    });
    expect(trackMock).toHaveBeenCalledWith(
      "ai_call",
      expect.objectContaining({ feature: "assist", model: "f", ok: true }),
      USER_ID,
    );
  });

  it("defaults existingChildren to [] when omitted", async () => {
    await POST(post({ roadmapTitle: "R", parentLabel: "P" }));
    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({ existingChildren: [] }),
    );
  });
});

describe("POST /api/ai/subtopics — errors", () => {
  it("422 generation_invalid after a failed repair", async () => {
    generateMock.mockRejectedValue(
      new StructuredOutputError("bad", [], {
        inputTokens: 1,
        outputTokens: 2,
        calls: 2,
      }),
    );
    const res = await POST(post(validBody));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("generation_invalid");
    expect(trackMock).toHaveBeenCalledWith(
      "ai_call",
      expect.objectContaining({ ok: false, code: "generation_invalid" }),
      USER_ID,
    );
  });

  it("maps a provider error to an actionable message", async () => {
    generateMock.mockRejectedValue({ statusCode: 401 });
    const res = await POST(post(validBody));
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toBe("invalid_key");
    expect(data.message).toMatch(/key/i);
    expect(trackMock).toHaveBeenCalledWith(
      "ai_call",
      expect.objectContaining({ ok: false, code: "invalid_key" }),
      USER_ID,
    );
  });
});
