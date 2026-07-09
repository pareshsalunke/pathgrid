import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { aiDisabled: false } }));
vi.mock("@/lib/ai/registry", () => ({ resolveProviderConfig: vi.fn() }));
vi.mock("@/lib/ai/quiz", () => ({
  generateQuiz: vi.fn(),
  StructuredOutputError: class StructuredOutputError extends Error {
    usage: unknown;
    constructor(message: string, _issues: string[], usage: unknown) {
      super(message);
      this.name = "StructuredOutputError";
      this.usage = usage;
    }
  },
}));
vi.mock("@/lib/db/roadmaps", () => ({ getRoadmapForChat: vi.fn() }));
vi.mock("@/lib/db/quiz", () => ({ getQuiz: vi.fn(), upsertQuiz: vi.fn() }));
vi.mock("@/lib/track", () => ({ track: vi.fn(async () => {}) }));

import { auth } from "@/auth";
import { env } from "@/lib/env";
import { resolveProviderConfig } from "@/lib/ai/registry";
import { generateQuiz, StructuredOutputError } from "@/lib/ai/quiz";
import { getRoadmapForChat } from "@/lib/db/roadmaps";
import { getQuiz, upsertQuiz } from "@/lib/db/quiz";
import { track } from "@/lib/track";
import { POST } from "./route";

const authMock = vi.mocked(auth);
const resolveMock = vi.mocked(resolveProviderConfig);
const generateMock = vi.mocked(generateQuiz);
const roadmapMock = vi.mocked(getRoadmapForChat);
const getQuizMock = vi.mocked(getQuiz);
const upsertMock = vi.mocked(upsertQuiz);
const trackMock = vi.mocked(track);

const USER_ID = "3f8b8f60-0f4b-4d5f-9d5c-000000000000";
const ROADMAP_ID = "3f8b8f60-0f4b-4d5f-9d5c-111111111111";
const QUIZ_ID = "3f8b8f60-0f4b-4d5f-9d5c-222222222222";

const providerConfig = {
  provider: "anthropic" as const,
  apiKey: "sk-ant-x",
  models: { smart: "s", fast: "f" },
};

const questions = Array.from({ length: 5 }, (_, i) => ({
  q: `Q${i}`,
  options: ["a", "b", "c", "d"],
  answerIdx: i % 4,
  why: `because ${i}`,
}));

const roadmap = {
  id: ROADMAP_ID,
  slug: null,
  title: "Map",
  brief: null,
  category: "custom",
  seo: null,
  graph: {
    $schema: "pathgrid/roadmap-graph/v1",
    meta: { title: "Map", level: "beginner", estHours: 2 },
    nodes: [
      {
        id: "title",
        type: "title",
        position: { x: 0, y: 0 },
        data: { label: "Map" },
      },
      {
        id: "a",
        type: "topic",
        position: { x: 0, y: 1 },
        data: { label: "A", slug: "a" },
      },
    ],
    edges: [],
  },
  topics: [
    {
      nodeId: "a",
      slug: "a",
      title: "Topic A",
      bodyMd: "body of A",
      meta: null,
      resources: [],
    },
  ],
};

function post(body: unknown) {
  return new Request("http://localhost/api/ai/quiz", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = { roadmapId: ROADMAP_ID, nodeId: "a" };

beforeEach(() => {
  vi.clearAllMocks();
  env.aiDisabled = false;
  authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
  resolveMock.mockReturnValue(providerConfig);
  roadmapMock.mockResolvedValue(roadmap as never);
  getQuizMock.mockResolvedValue(null); // default: cache miss
  upsertMock.mockResolvedValue({ id: QUIZ_ID });
  generateMock.mockResolvedValue({
    questions,
    usage: { inputTokens: 10, outputTokens: 20, calls: 1 },
    repaired: false,
  } as never);
});

describe("POST /api/ai/quiz — guards", () => {
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
    const res = await POST(post({ nodeId: "a" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_body");
  });

  it("404 when the roadmap is inaccessible", async () => {
    roadmapMock.mockResolvedValue(null);
    const res = await POST(post(validBody));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("roadmap_not_found");
  });

  it("404 when the node is not a content node", async () => {
    const res = await POST(post({ roadmapId: ROADMAP_ID, nodeId: "title" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("topic_not_found");
  });
});

describe("POST /api/ai/quiz — cache", () => {
  it("cache hit → returns stripped questions, no model call, no event", async () => {
    getQuizMock.mockResolvedValue({
      id: QUIZ_ID,
      roadmapId: ROADMAP_ID,
      nodeId: "a",
      questions,
    });
    const res = await POST(post(validBody));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({ quizId: QUIZ_ID, cached: true });
    expect(data.questions).toHaveLength(5);
    expect(data.questions[0]).toEqual({
      q: "Q0",
      options: ["a", "b", "c", "d"],
    });
    expect(data.questions[0]).not.toHaveProperty("answerIdx");
    expect(generateMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("cache miss → generates, caches, logs, returns stripped questions + usage", async () => {
    const res = await POST(post(validBody));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.cached).toBe(false);
    expect(data.usage).toEqual({ inputTokens: 10, outputTokens: 20 });
    expect(data.questions[0]).not.toHaveProperty("answerIdx");

    expect(generateMock).toHaveBeenCalledWith({
      config: providerConfig,
      title: "Topic A",
      context: "body of A",
    });
    expect(upsertMock).toHaveBeenCalledWith({
      roadmapId: ROADMAP_ID,
      nodeId: "a",
      questions,
      model: "f",
    });
    expect(trackMock).toHaveBeenCalledWith(
      "ai_call",
      expect.objectContaining({ feature: "quiz", model: "f", ok: true }),
      USER_ID,
    );
  });

  it("label-only context when the map has no topic row (generated maps)", async () => {
    roadmapMock.mockResolvedValue({ ...roadmap, topics: [] } as never);
    await POST(post(validBody));
    expect(generateMock).toHaveBeenCalledWith({
      config: providerConfig,
      title: "A", // node label
      context: null,
    });
  });
});

describe("POST /api/ai/quiz — errors", () => {
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
