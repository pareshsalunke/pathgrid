import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { aiDisabled: false } }));
vi.mock("@/lib/ai/registry", () => ({ resolveProviderConfig: vi.fn() }));
vi.mock("@/lib/ai/generate-roadmap", () => {
  class GenerationInvalidError extends Error {
    issues: string[] = [];
    usage = { inputTokens: 0, outputTokens: 0, calls: 0 };
  }
  class StructuredOutputError extends Error {
    issues: string[] = [];
    usage = { inputTokens: 0, outputTokens: 0, calls: 0 };
  }
  return {
    generateRoadmap: vi.fn(),
    GenerationInvalidError,
    StructuredOutputError,
  };
});
vi.mock("@/lib/db/generated", () => ({ createGeneratedRoadmap: vi.fn() }));
vi.mock("@/lib/track", () => ({ track: vi.fn(async () => {}) }));

import { auth } from "@/auth";
import { env } from "@/lib/env";
import { resolveProviderConfig } from "@/lib/ai/registry";
import { generateRoadmap } from "@/lib/ai/generate-roadmap";
import { createGeneratedRoadmap } from "@/lib/db/generated";
import { track } from "@/lib/track";
import { POST } from "./route";

const authMock = vi.mocked(auth);
const resolveMock = vi.mocked(resolveProviderConfig);
const generateMock = vi.mocked(generateRoadmap);
const createMock = vi.mocked(createGeneratedRoadmap);
const trackMock = vi.mocked(track);

const goodBody = {
  goal: "Learn TypeScript for backend work",
  level: "beginner",
  hoursPerWeek: 5,
};

const providerConfig = {
  provider: "anthropic" as const,
  apiKey: "sk-ant-x",
  models: { smart: "s", fast: "f" },
};

function request(body: unknown = goodBody): Request {
  return new Request("http://localhost/api/ai/roadmap", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

async function readEvents(res: Response): Promise<Record<string, unknown>[]> {
  const text = await res.text();
  return text
    .split("\n\n")
    .filter((chunk) => chunk.startsWith("data: "))
    .map((chunk) => JSON.parse(chunk.slice("data: ".length)));
}

beforeEach(() => {
  vi.clearAllMocks();
  env.aiDisabled = false;
  authMock.mockResolvedValue({ user: { id: "u1" } } as never);
  resolveMock.mockReturnValue(providerConfig);
});

describe("POST /api/ai/roadmap guards", () => {
  it("401 when signed out", async () => {
    authMock.mockResolvedValue(null as never);
    const res = await POST(request());
    expect(res.status).toBe(401);
  });

  it("503 ai_disabled when the kill switch is on", async () => {
    env.aiDisabled = true;
    const res = await POST(request());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "ai_disabled" });
  });

  it("400 no_provider_key without BYOK headers", async () => {
    resolveMock.mockReturnValue(null);
    const res = await POST(request());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "no_provider_key" });
  });

  it("400 invalid_body on bad input (goal too short / hours out of range)", async () => {
    expect((await POST(request({ ...goodBody, goal: "x" }))).status).toBe(400);
    expect(
      (await POST(request({ ...goodBody, hoursPerWeek: 500 }))).status,
    ).toBe(400);
  });
});

describe("POST /api/ai/roadmap stream", () => {
  it("streams progress events and finishes with done + roadmapId + usage", async () => {
    const fakeGraph = { $schema: "pathgrid/roadmap-graph/v1", nodes: [] };
    generateMock.mockImplementation(async ({ onProgress }) => {
      onProgress?.("outline");
      onProgress?.("graphify");
      onProgress?.("layout");
      return {
        graph: fakeGraph as never,
        title: "TS Path",
        usage: { inputTokens: 300, outputTokens: 200, calls: 2 },
      };
    });
    createMock.mockResolvedValue({ roadmapId: "rm-1" });

    const res = await POST(request());
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const events = await readEvents(res);
    expect(events.map((e) => e.type)).toEqual([
      "progress",
      "progress",
      "progress",
      "progress",
      "done",
    ]);
    expect(events.map((e) => e.step).slice(0, 4)).toEqual([
      "outline",
      "graphify",
      "layout",
      "save",
    ]);
    const done = events.at(-1)!;
    expect(done.roadmapId).toBe("rm-1");
    expect(done.usage).toEqual({
      inputTokens: 300,
      outputTokens: 200,
      calls: 2,
    });
    // The hub previews straight from the done event — graph must ride along.
    expect(done.graph).toEqual(fakeGraph);

    // Token logging (docs/04 §2 ai_call) — never the key.
    const call = trackMock.mock.calls.find((c) => c[0] === "ai_call");
    expect(call).toBeDefined();
    expect(call![1]).toMatchObject({
      feature: "roadmap",
      provider: "anthropic",
      ok: true,
      inTokens: 300,
      outTokens: 200,
    });
    expect(JSON.stringify(call![1])).not.toContain("sk-ant-x");
  });

  it("sends a mapped provider error event on failure", async () => {
    generateMock.mockRejectedValue(
      Object.assign(new Error("bad key"), { statusCode: 401 }),
    );
    const res = await POST(request());
    const events = await readEvents(res);
    const last = events.at(-1)!;
    expect(last.type).toBe("error");
    expect(last.code).toBe("invalid_key");
    const call = trackMock.mock.calls.find((c) => c[0] === "ai_call");
    expect(call![1]).toMatchObject({ ok: false, code: "invalid_key" });
  });
});
