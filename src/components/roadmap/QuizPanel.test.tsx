import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/frontend-developer",
}));
vi.mock("next-auth/react", () => ({ useSession: vi.fn() }));

import { useSession } from "next-auth/react";
import { QuizPanel } from "./QuizPanel";
import { useAIProvider } from "@/lib/stores/ai-provider";
import { useAiSession } from "@/lib/stores/ai-session";

const useSessionMock = vi.mocked(useSession);

const publicQuestions = [
  { q: "What is a closure?", options: ["Alpha", "Beta", "Gamma", "Delta"] },
  { q: "Second question?", options: ["Alpha", "Beta", "Gamma", "Delta"] },
];

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

function renderPanel(props: Partial<Parameters<typeof QuizPanel>[0]> = {}) {
  return render(
    <QuizPanel
      roadmapId="r1"
      nodeId="a"
      title="Closures"
      onClose={() => {}}
      {...props}
    />,
  );
}

beforeEach(() => {
  useAIProvider.setState({ provider: "anthropic", keys: {}, models: {} });
  useAiSession.setState({ inputTokens: 0, outputTokens: 0 });
  localStorage.clear();
  useSessionMock.mockReturnValue({ status: "authenticated" } as never);
});
afterEach(() => vi.unstubAllGlobals());

describe("QuizPanel gating", () => {
  it("anonymous → login CTA carrying the current path as callbackUrl", () => {
    useSessionMock.mockReturnValue({ status: "unauthenticated" } as never);
    renderPanel();
    const cta = screen.getByRole("link", { name: "Log in" });
    expect(cta).toHaveAttribute(
      "href",
      "/login?callbackUrl=%2Ffrontend-developer",
    );
  });

  it("authed but no key → connect-key card deep-linking to Settings", () => {
    renderPanel();
    expect(screen.getByRole("link", { name: "Connect key" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });
});

describe("QuizPanel flow", () => {
  beforeEach(() => {
    useAIProvider.setState({
      provider: "anthropic",
      keys: { anthropic: "sk-x" },
      models: {},
    });
  });

  it("generates, lets you answer, then grades with score + explanations", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        url === "/api/ai/quiz"
          ? jsonResponse({
              quizId: "q1",
              questions: publicQuestions,
              cached: false,
              usage: { inputTokens: 5, outputTokens: 9 },
            })
          : jsonResponse({
              score: 1,
              total: 2,
              results: [
                { correct: true, answerIdx: 0, why: "first is right" },
                { correct: false, answerIdx: 2, why: "you missed this" },
              ],
            }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderPanel();

    // Questions render once generation resolves.
    await waitFor(() =>
      expect(screen.getByText("What is a closure?")).toBeInTheDocument(),
    );
    // A real (non-cached) generation feeds the session token meter.
    expect(useAiSession.getState().inputTokens).toBe(5);

    // Answer both questions (option "Alpha" in each).
    const alphas = screen.getAllByText("Alpha");
    fireEvent.click(alphas[0]);
    fireEvent.click(alphas[1]);

    fireEvent.click(screen.getByRole("button", { name: "Check answers" }));

    await waitFor(() =>
      expect(screen.getByText("You scored 1 / 2")).toBeInTheDocument(),
    );
    expect(screen.getByText("first is right")).toBeInTheDocument();
    expect(screen.getByText("you missed this")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/quiz-attempts",
      expect.anything(),
    );
  });

  it("surfaces an actionable error from the quiz route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(
            { error: "invalid_key", message: "That key was rejected." },
            false,
            502,
          ),
        ),
      ),
    );
    renderPanel();
    await waitFor(() =>
      expect(screen.getByText("That key was rejected.")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });
});
