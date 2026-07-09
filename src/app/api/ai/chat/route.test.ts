import { describe, it, expect, vi, beforeEach } from "vitest";

// after() throws outside a real request scope — stub it and capture callbacks.
vi.mock("next/server", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/server")>();
  return { ...mod, after: vi.fn() };
});
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { aiDisabled: false } }));
vi.mock("@/lib/ai/registry", () => ({ resolveProviderConfig: vi.fn() }));
vi.mock("@/lib/ai/tutor", () => ({
  runTutorTurn: vi.fn(),
  summarizeThread: vi.fn(),
}));
vi.mock("@/lib/db/roadmaps", () => ({ getRoadmapForChat: vi.fn() }));
vi.mock("@/lib/db/progress", () => ({ getUserProgress: vi.fn() }));
vi.mock("@/lib/db/chat", () => ({
  createThread: vi.fn(),
  getThreadForOwner: vi.fn(),
  listRecentMessages: vi.fn(),
  insertUserMessage: vi.fn(),
  insertAssistantMessage: vi.fn(),
  updateUserMessageTokens: vi.fn(),
  unsummarizedOlderCount: vi.fn(),
  listUnsummarizedOlder: vi.fn(),
  updateThreadSummary: vi.fn(),
}));
vi.mock("@/lib/track", () => ({ track: vi.fn(async () => {}) }));

import { after } from "next/server";
import { auth } from "@/auth";
import { env } from "@/lib/env";
import { resolveProviderConfig } from "@/lib/ai/registry";
import { runTutorTurn, summarizeThread } from "@/lib/ai/tutor";
import { getRoadmapForChat } from "@/lib/db/roadmaps";
import { getUserProgress } from "@/lib/db/progress";
import {
  createThread,
  getThreadForOwner,
  listRecentMessages,
  insertUserMessage,
  insertAssistantMessage,
  updateUserMessageTokens,
  unsummarizedOlderCount,
  listUnsummarizedOlder,
  updateThreadSummary,
} from "@/lib/db/chat";
import { track } from "@/lib/track";
import { POST } from "./route";

const afterMock = vi.mocked(after);
const authMock = vi.mocked(auth);
const resolveMock = vi.mocked(resolveProviderConfig);
const runMock = vi.mocked(runTutorTurn);
const summarizeMock = vi.mocked(summarizeThread);
const roadmapMock = vi.mocked(getRoadmapForChat);
const progressMock = vi.mocked(getUserProgress);
const createThreadMock = vi.mocked(createThread);
const getThreadMock = vi.mocked(getThreadForOwner);
const historyMock = vi.mocked(listRecentMessages);
const insertUserMock = vi.mocked(insertUserMessage);
const insertAssistantMock = vi.mocked(insertAssistantMessage);
const updateTokensMock = vi.mocked(updateUserMessageTokens);
const olderCountMock = vi.mocked(unsummarizedOlderCount);
const olderListMock = vi.mocked(listUnsummarizedOlder);
const updateSummaryMock = vi.mocked(updateThreadSummary);
const trackMock = vi.mocked(track);

const THREAD_ID = "3f8b8f60-0f4b-4d5f-9d5c-111111111111";
const ROADMAP_ID = "3f8b8f60-0f4b-4d5f-9d5c-222222222222";

const providerConfig = {
  provider: "anthropic" as const,
  apiKey: "sk-ant-x",
  models: { smart: "s", fast: "f" },
};

const groundedRoadmap = {
  id: ROADMAP_ID,
  slug: null,
  title: "Frontend",
  brief: null,
  category: "custom" as const,
  seo: null,
  graph: {
    $schema: "pathgrid/roadmap-graph/v1",
    meta: { title: "Frontend", level: "beginner", estHours: 10 },
    nodes: [
      { id: "title", type: "title", data: { label: "Frontend" } },
      {
        id: "html",
        type: "topic",
        data: { label: "HTML", slug: "html", order: 1 },
      },
      {
        id: "css",
        type: "topic",
        data: { label: "CSS", slug: "css", order: 2 },
      },
    ],
    edges: [],
  },
  topics: [
    {
      nodeId: "html",
      slug: "html",
      title: "HTML",
      bodyMd: "Structure of the web.",
      meta: null,
      resources: [],
    },
  ],
} as never;

function request(body: unknown): Request {
  return new Request("http://localhost/api/ai/chat", {
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
  historyMock.mockResolvedValue([]);
  insertUserMock.mockResolvedValue({ id: 11 });
  insertAssistantMock.mockResolvedValue({ id: 12 });
  updateTokensMock.mockResolvedValue();
  olderCountMock.mockResolvedValue(0);
  progressMock.mockResolvedValue({});
  createThreadMock.mockResolvedValue({ id: THREAD_ID });
  runMock.mockImplementation(async ({ onDelta }) => {
    onDelta("Hello ");
    onDelta("world.");
    return {
      text: "Hello world.",
      usage: { inputTokens: 120, outputTokens: 45 },
    };
  });
});

describe("POST /api/ai/chat guards", () => {
  it("401 when signed out", async () => {
    authMock.mockResolvedValue(null as never);
    expect((await POST(request({ message: "hi" }))).status).toBe(401);
  });

  it("503 ai_disabled when the kill switch is on", async () => {
    env.aiDisabled = true;
    const res = await POST(request({ message: "hi" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "ai_disabled" });
  });

  it("400 no_provider_key without BYOK headers", async () => {
    resolveMock.mockReturnValue(null);
    const res = await POST(request({ message: "hi" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "no_provider_key" });
  });

  it("400 invalid_body on empty/oversized message or bad ids", async () => {
    expect((await POST(request({ message: "" }))).status).toBe(400);
    expect((await POST(request({ message: "x".repeat(4001) }))).status).toBe(
      400,
    );
    expect(
      (await POST(request({ message: "hi", threadId: "not-a-uuid" }))).status,
    ).toBe(400);
  });

  it("404 thread_not_found for a missing or foreign thread — plain JSON, no stream", async () => {
    getThreadMock.mockResolvedValue(null);
    const res = await POST(request({ message: "hi", threadId: THREAD_ID }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "thread_not_found" });
    expect(insertUserMock).not.toHaveBeenCalled();
  });

  it("404 roadmap_not_found when a new thread names an inaccessible roadmap", async () => {
    roadmapMock.mockResolvedValue(null);
    const res = await POST(request({ message: "hi", roadmapId: ROADMAP_ID }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "roadmap_not_found" });
    expect(createThreadMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/ai/chat stream", () => {
  it("new general thread: meta first, deltas, done + persistence with token split", async () => {
    const res = await POST(request({ message: "How do I start learning?" }));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const events = await readEvents(res);
    expect(events.map((e) => e.type)).toEqual([
      "meta",
      "delta",
      "delta",
      "done",
    ]);
    expect(events[0]).toEqual({
      type: "meta",
      threadId: THREAD_ID,
      title: "How do I start learning?",
    });
    expect(events[1]).toEqual({ type: "delta", text: "Hello " });
    expect(events.at(-1)).toEqual({
      type: "done",
      usage: { inputTokens: 120, outputTokens: 45 },
    });

    expect(createThreadMock).toHaveBeenCalledWith({
      userId: "u1",
      roadmapId: null,
      title: "How do I start learning?",
    });
    expect(insertUserMock).toHaveBeenCalledWith(
      THREAD_ID,
      "How do I start learning?",
    );
    expect(updateTokensMock).toHaveBeenCalledWith(11, 120);
    expect(insertAssistantMock).toHaveBeenCalledWith(
      THREAD_ID,
      "Hello world.",
      45,
    );

    // General tutor variant — no path outline.
    const args = runMock.mock.calls[0][0];
    expect(args.system).toContain("You are the tutor on Pathgrid");
    expect(args.system).not.toContain("PATH OUTLINE");

    const call = trackMock.mock.calls.find((c) => c[0] === "ai_call");
    expect(call![1]).toMatchObject({
      feature: "chat",
      provider: "anthropic",
      model: "s",
      inTokens: 120,
      outTokens: 45,
      ok: true,
    });
    expect(JSON.stringify(call![1])).not.toContain("sk-ant-x");
  });

  it("derives a collapsed, capped title from the first message", async () => {
    const res = await POST(
      request({ message: "  why \n does " + "w".repeat(80) }),
    );
    const [meta] = await readEvents(res);
    const title = meta.title as string;
    expect(title.startsWith("why does ")).toBe(true);
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(61);
    expect(title).not.toContain("\n");
  });

  it("grounds a new thread: outline with statuses + open topic body in the system prompt", async () => {
    roadmapMock.mockResolvedValue(groundedRoadmap);
    progressMock.mockResolvedValue({ html: "done" });

    await readEvents(
      await POST(
        request({
          message: "explain this",
          roadmapId: ROADMAP_ID,
          openTopicNodeId: "html",
        }),
      ),
    );

    expect(roadmapMock).toHaveBeenCalledWith(ROADMAP_ID, "u1");
    expect(createThreadMock).toHaveBeenCalledWith({
      userId: "u1",
      roadmapId: ROADMAP_ID,
      title: "explain this",
    });

    const args = runMock.mock.calls[0][0];
    expect(args.system).toContain(
      'You are the tutor for the "Frontend" learning path on Pathgrid',
    );
    expect(args.system).toContain("1. HTML — done");
    expect(args.system).toContain("2. CSS — pending");
    expect(args.system).toContain("CURRENTLY OPEN TOPIC: HTML");
    expect(args.system).toContain("Structure of the web.");
  });

  it("label-only open topic (generated map) gets the own-knowledge note; stale node ids are omitted", async () => {
    roadmapMock.mockResolvedValue(groundedRoadmap);

    await readEvents(
      await POST(
        request({
          message: "explain css",
          roadmapId: ROADMAP_ID,
          openTopicNodeId: "css", // no topics row for css
        }),
      ),
    );
    expect(runMock.mock.calls[0][0].system).toContain(
      "CURRENTLY OPEN TOPIC: CSS",
    );
    expect(runMock.mock.calls[0][0].system).toContain(
      "No stored notes for this topic",
    );

    runMock.mockClear();
    await readEvents(
      await POST(
        request({
          message: "explain?",
          roadmapId: ROADMAP_ID,
          openTopicNodeId: "gone",
        }),
      ),
    );
    expect(runMock.mock.calls[0][0].system).not.toContain(
      "CURRENTLY OPEN TOPIC",
    );
  });

  it("existing thread: passes windowed history + stored summary, ignores body roadmapId", async () => {
    getThreadMock.mockResolvedValue({
      id: THREAD_ID,
      userId: "u1",
      roadmapId: null,
      roadmapSlug: null,
      roadmapTitle: null,
      title: "Old title",
      summary: "Learner knows JS.",
      summaryUpto: 5,
    });
    historyMock.mockResolvedValue([
      { id: 9, role: "user", content: "earlier q", tokens: 10, createdAt: "" },
      {
        id: 10,
        role: "assistant",
        content: "earlier a",
        tokens: 5,
        createdAt: "",
      },
    ]);

    const events = await readEvents(
      await POST(
        request({
          message: "and next?",
          threadId: THREAD_ID,
          roadmapId: ROADMAP_ID, // must be ignored — thread grounding wins
        }),
      ),
    );

    expect(events[0]).toEqual({
      type: "meta",
      threadId: THREAD_ID,
      title: "Old title",
    });
    expect(roadmapMock).not.toHaveBeenCalled();
    expect(createThreadMock).not.toHaveBeenCalled();
    expect(historyMock).toHaveBeenCalledWith(THREAD_ID, 20);

    const args = runMock.mock.calls[0][0];
    expect(args.history).toEqual([
      { role: "user", content: "earlier q" },
      { role: "assistant", content: "earlier a" },
    ]);
    expect(args.message).toBe("and next?");
    expect(args.system).toContain(
      "EARLIER CONVERSATION SUMMARY:\nLearner knows JS.",
    );
  });

  it("provider error: user row stays, no assistant row, mapped SSE error", async () => {
    runMock.mockRejectedValue(
      Object.assign(new Error("bad key"), { statusCode: 401 }),
    );
    const events = await readEvents(await POST(request({ message: "hi" })));

    const last = events.at(-1)!;
    expect(last.type).toBe("error");
    expect(last.code).toBe("invalid_key");

    expect(insertUserMock).toHaveBeenCalled();
    expect(insertAssistantMock).not.toHaveBeenCalled();
    expect(updateTokensMock).not.toHaveBeenCalled();

    const call = trackMock.mock.calls.find((c) => c[0] === "ai_call");
    expect(call![1]).toMatchObject({ ok: false, code: "invalid_key" });
  });
});

describe("POST /api/ai/chat rolling summary", () => {
  const thread = {
    id: THREAD_ID,
    userId: "u1",
    roadmapId: null,
    roadmapSlug: null,
    roadmapTitle: null,
    title: "T",
    summary: "old summary",
    summaryUpto: 5,
  };

  it("does not schedule below the hysteresis threshold", async () => {
    getThreadMock.mockResolvedValue(thread);
    olderCountMock.mockResolvedValue(9);
    await readEvents(
      await POST(request({ message: "hi", threadId: THREAD_ID })),
    );
    expect(afterMock).not.toHaveBeenCalled();
  });

  it("schedules after() at ≥10 and the callback folds + stores the summary", async () => {
    getThreadMock.mockResolvedValue(thread);
    olderCountMock.mockResolvedValue(12);
    olderListMock.mockResolvedValue({
      messages: [
        { id: 6, role: "user", content: "a", tokens: null, createdAt: "" },
      ],
      upto: 30,
    });
    summarizeMock.mockResolvedValue({
      summary: "new summary",
      usage: { inputTokens: 50, outputTokens: 12 },
    });

    await readEvents(
      await POST(request({ message: "hi", threadId: THREAD_ID })),
    );
    expect(olderCountMock).toHaveBeenCalledWith(THREAD_ID, 5, 20);
    expect(afterMock).toHaveBeenCalledTimes(1);

    // Run the captured post-response callback.
    await (afterMock.mock.calls[0][0] as () => Promise<void>)();

    expect(olderListMock).toHaveBeenCalledWith(THREAD_ID, 5, 20);
    expect(summarizeMock).toHaveBeenCalledWith({
      config: providerConfig,
      priorSummary: "old summary",
      messages: [{ role: "user", content: "a" }],
    });
    expect(updateSummaryMock).toHaveBeenCalledWith(
      THREAD_ID,
      "new summary",
      30,
    );
    const call = trackMock.mock.calls.find(
      (c) => (c[1] as { feature?: string })?.feature === "chat_summary",
    );
    expect(call![1]).toMatchObject({ ok: true, model: "f" });
  });

  it("summary failures are swallowed (logged, chat unaffected)", async () => {
    getThreadMock.mockResolvedValue(thread);
    olderCountMock.mockResolvedValue(12);
    olderListMock.mockRejectedValue(new Error("db down"));

    await readEvents(
      await POST(request({ message: "hi", threadId: THREAD_ID })),
    );
    await expect(
      (afterMock.mock.calls[0][0] as () => Promise<void>)(),
    ).resolves.toBeUndefined();

    expect(updateSummaryMock).not.toHaveBeenCalled();
    const call = trackMock.mock.calls.find(
      (c) => (c[1] as { feature?: string })?.feature === "chat_summary",
    );
    expect(call![1]).toMatchObject({ ok: false });
  });
});
