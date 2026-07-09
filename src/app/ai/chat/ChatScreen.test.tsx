import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { ChatScreen } from "./ChatScreen";
import { useAIProvider } from "@/lib/stores/ai-provider";
import { useAiSession } from "@/lib/stores/ai-session";
import type { ChatThreadCard } from "@/lib/db/chat";

const THREAD_ID = "3f8b8f60-0f4b-4d5f-9d5c-111111111111";

function sseStream(
  events: Record<string, unknown>[],
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const e of events)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      controller.close();
    },
  });
}

const context = {
  roadmapId: "3f8b8f60-0f4b-4d5f-9d5c-222222222222",
  title: "Frontend",
  href: "/frontend-developer",
};

const threads: ChatThreadCard[] = [
  {
    id: THREAD_ID,
    title: "Picking a framework",
    roadmapId: context.roadmapId,
    roadmapSlug: "frontend-developer",
    roadmapTitle: "Frontend",
    lastActivity: new Date().toISOString(),
  },
];

function renderScreen(props: Partial<Parameters<typeof ChatScreen>[0]> = {}) {
  return render(
    <ChatScreen
      threads={threads}
      activeThreadId={null}
      initialMessages={[]}
      context={context}
      prefill={undefined}
      openTopicNodeId={undefined}
      {...props}
    />,
  );
}

beforeEach(() => {
  useAIProvider.setState({ provider: "anthropic", keys: {}, models: {} });
  useAiSession.setState({ inputTokens: 0, outputTokens: 0 });
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("ChatScreen gating + shell", () => {
  it("no key → missing-key card, dimmed composer, disabled input", () => {
    renderScreen();
    expect(
      screen.getByText("Add an AI key to start chatting"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(screen.getByLabelText("Message the tutor")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("renders the context chip with a Change link and the rail threads", () => {
    renderScreen();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Change" })).toHaveAttribute(
      "href",
      "/frontend-developer",
    );
    expect(
      screen.getByText("Answers cite nodes from this map"),
    ).toBeInTheDocument();
    // Rail entry (desktop + mobile lists both render it).
    expect(
      screen.getAllByRole("link", { name: /Picking a framework/ }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "New chat" })[0],
    ).toHaveAttribute("href", "/ai/chat");
  });

  it("general tutor (no context) shows the ungrounded chip and copy", () => {
    renderScreen({ context: null });
    expect(screen.getAllByText("General tutor").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("link", { name: "Change" }),
    ).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask the tutor…")).toBeInTheDocument();
  });

  it("renders persisted messages and prefills the composer from ?q=", () => {
    useAIProvider.setState({ keys: { anthropic: "sk-ant-1" } });
    renderScreen({
      activeThreadId: THREAD_ID,
      initialMessages: [
        { id: "1", role: "user", content: "How do I pick users?" },
        { id: "2", role: "assistant", content: "Start with recency." },
      ],
      prefill: "Explain this topic",
    });
    expect(screen.getByText("How do I pick users?")).toBeInTheDocument();
    expect(screen.getByText("Start with recency.")).toBeInTheDocument();
    expect(screen.getByLabelText("Message the tutor")).toHaveValue(
      "Explain this topic",
    );
  });
});

describe("ChatScreen send flow", () => {
  beforeEach(() => {
    useAIProvider.setState({ keys: { anthropic: "sk-ant-1" } });
  });

  it("streams a new thread: optimistic bubble, URL swap on meta, reply, rail + tokens", async () => {
    const replaceSpy = vi.spyOn(window.history, "replaceState");
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      body: sseStream([
        { type: "meta", threadId: THREAD_ID, title: "What next?" },
        { type: "delta", text: "Do " },
        { type: "delta", text: "CSS next." },
        { type: "done", usage: { inputTokens: 120, outputTokens: 45 } },
      ]),
      json: async () => ({}),
    }));
    vi.stubGlobal("fetch", fetchMock);

    renderScreen({ openTopicNodeId: "html" });
    fireEvent.change(screen.getByLabelText("Message the tutor"), {
      target: { value: "What next?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    // Optimistic user bubble appears immediately.
    expect(screen.getByText("What next?")).toBeInTheDocument();
    expect(await screen.findByText("Do CSS next.")).toBeInTheDocument();

    // Request carried the roadmap grounding + open topic; thread not yet known.
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string; headers: Record<string, string> },
    ];
    expect(JSON.parse(init.body)).toEqual({
      message: "What next?",
      roadmapId: context.roadmapId,
      openTopicNodeId: "html",
    });
    expect(init.headers.Authorization).toBe("Bearer sk-ant-1");

    // Shallow URL swap to the thread route, rail gains the thread.
    // (history.state is null in jsdom — assert on the URL argument.)
    expect(replaceSpy).toHaveBeenCalled();
    expect(replaceSpy.mock.calls[0][2]).toBe(`/ai/chat/${THREAD_ID}`);
    expect(
      screen.getAllByRole("link", { name: /What next\?/ }).length,
    ).toBeGreaterThan(0);

    // Session + thread token accounting.
    expect(useAiSession.getState().inputTokens).toBe(120);
    expect(useAiSession.getState().outputTokens).toBe(45);
    expect(screen.getByText(/165 in this thread/)).toBeInTheDocument();

    // Second send reuses the thread id.
    fireEvent.change(screen.getByLabelText("Message the tutor"), {
      target: { value: "And after that?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, second] = fetchMock.mock.calls[1] as unknown as [
      string,
      { body: string },
    ];
    expect(JSON.parse(second.body)).toMatchObject({ threadId: THREAD_ID });
  });

  it("shows the mapped SSE error and keeps the user bubble (message persisted)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        body: sseStream([
          { type: "meta", threadId: THREAD_ID, title: "Key check" },
          {
            type: "error",
            code: "invalid_key",
            message: "That key was rejected. Check it and try again.",
          },
        ]),
        json: async () => ({}),
      })),
    );

    renderScreen();
    fireEvent.change(screen.getByLabelText("Message the tutor"), {
      target: { value: "hi" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText(/That key was rejected/),
    ).toBeInTheDocument();
    expect(screen.getByText("hi")).toBeInTheDocument();
  });

  it("pre-stream failure restores the draft and drops the optimistic bubble", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 400,
        body: null,
        json: async () => ({ error: "no_provider_key" }),
      })),
    );

    renderScreen();
    fireEvent.change(screen.getByLabelText("Message the tutor"), {
      target: { value: "hello there" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText(/Add your API key in Settings first/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Message the tutor")).toHaveValue(
      "hello there",
    );
  });
});
