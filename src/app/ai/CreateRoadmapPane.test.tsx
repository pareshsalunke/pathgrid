import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let searchParams = new URLSearchParams("");
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));
vi.mock("next-auth/react", () => ({ useSession: vi.fn() }));
vi.mock("@/components/roadmap/RoadmapCanvas", () => ({
  RoadmapCanvas: () => <div data-testid="canvas-preview" />,
}));

import { useSession } from "next-auth/react";
import { CreateRoadmapPane, ComingSoonPane } from "./CreateRoadmapPane";
import { useAIProvider } from "@/lib/stores/ai-provider";
import { useAiSession } from "@/lib/stores/ai-session";

const useSessionMock = vi.mocked(useSession);

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

const doneGraph = {
  $schema: "pathgrid/roadmap-graph/v1",
  meta: { title: "TS Path", level: "mixed", estHours: 48 },
  nodes: [
    {
      id: "title",
      type: "title",
      position: { x: 0, y: 0 },
      data: { label: "TS Path" },
    },
    {
      id: "sec",
      type: "section",
      position: { x: 0, y: 100 },
      data: { label: "Basics" },
    },
    {
      id: "t1",
      type: "topic",
      position: { x: 0, y: 200 },
      data: { label: "Types", slug: "types" },
    },
  ],
  edges: [],
};

beforeEach(() => {
  searchParams = new URLSearchParams("");
  useAIProvider.setState({ provider: "anthropic", keys: {}, models: {} });
  useAiSession.setState({ inputTokens: 0, outputTokens: 0 });
  localStorage.clear();
  useSessionMock.mockReturnValue({ status: "authenticated" } as never);
});
afterEach(() => vi.unstubAllGlobals());

describe("CreateRoadmapPane gating", () => {
  it("anonymous → login CTA with callbackUrl, no generate button", () => {
    useSessionMock.mockReturnValue({ status: "unauthenticated" } as never);
    render(<CreateRoadmapPane />);
    const cta = screen.getByRole("link", { name: "Log in to generate" });
    expect(cta).toHaveAttribute("href", "/login?callbackUrl=%2Fai");
    expect(
      screen.queryByRole("button", { name: "Generate roadmap" }),
    ).not.toBeInTheDocument();
  });

  it("authed without a key → connect-key card linking to Settings", () => {
    render(<CreateRoadmapPane />);
    expect(screen.getByText(/Connect your API key/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connect key" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("prefills the goal from ?goal=", () => {
    searchParams = new URLSearchParams("goal=Learn%20Rust");
    render(<CreateRoadmapPane />);
    expect(screen.getByLabelText("Your goal")).toHaveValue("Learn Rust");
  });
});

describe("CreateRoadmapPane generation flow", () => {
  beforeEach(() => {
    useAIProvider.setState({ keys: { anthropic: "sk-ant-1" } });
  });

  it("streams progress then shows the saved result and counts session tokens", async () => {
    const usage = { inputTokens: 300, outputTokens: 200, calls: 2 };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        body: sseStream([
          { type: "progress", step: "outline" },
          { type: "progress", step: "graphify" },
          { type: "progress", step: "layout" },
          { type: "progress", step: "save" },
          {
            type: "done",
            roadmapId: "rm-1",
            title: "TS Path",
            usage,
            graph: doneGraph,
          },
        ]),
        json: async () => ({}),
      })),
    );

    render(<CreateRoadmapPane />);
    fireEvent.change(screen.getByLabelText("Your goal"), {
      target: { value: "Learn TypeScript properly" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate roadmap" }));

    expect(await screen.findByText("TS Path")).toBeInTheDocument();
    expect(screen.getByText(/saved to your library/i)).toBeInTheDocument();
    expect(screen.getByTestId("canvas-preview")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open full map" })).toHaveAttribute(
      "href",
      "/ai/roadmap/rm-1",
    );
    expect(screen.getByText(/1 stages · 1 topics/)).toBeInTheDocument();
    expect(useAiSession.getState().inputTokens).toBe(300);
    expect(useAiSession.getState().outputTokens).toBe(200);
  });

  it("shows the mapped message from an SSE error event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        body: sseStream([
          { type: "progress", step: "outline" },
          {
            type: "error",
            code: "invalid_key",
            message: "That key was rejected. Check it and try again.",
          },
        ]),
        json: async () => ({}),
      })),
    );

    render(<CreateRoadmapPane />);
    fireEvent.change(screen.getByLabelText("Your goal"), {
      target: { value: "Learn TypeScript properly" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate roadmap" }));

    expect(
      await screen.findByText(/That key was rejected/),
    ).toBeInTheDocument();
    // Back on the form pane.
    expect(screen.getByLabelText("Your goal")).toBeInTheDocument();
  });

  it("handles a non-OK pre-stream response (no_provider_key)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 400,
        body: null,
        json: async () => ({ error: "no_provider_key" }),
      })),
    );

    render(<CreateRoadmapPane />);
    fireEvent.change(screen.getByLabelText("Your goal"), {
      target: { value: "Learn TypeScript properly" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate roadmap" }));

    expect(
      await screen.findByText(/Add your API key in Settings first/),
    ).toBeInTheDocument();
  });

  it("disables generate for a too-short goal", () => {
    render(<CreateRoadmapPane />);
    fireEvent.change(screen.getByLabelText("Your goal"), {
      target: { value: "x" },
    });
    expect(
      screen.getByRole("button", { name: "Generate roadmap" }),
    ).toBeDisabled();
  });
});

describe("ComingSoonPane", () => {
  it("renders the mode copy with a coming-soon chip", () => {
    render(<ComingSoonPane mode="quiz" />);
    expect(screen.getByText("Test what you know")).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });
});
