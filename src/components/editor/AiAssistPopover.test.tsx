import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/editor/r1",
}));
vi.mock("next-auth/react", () => ({ useSession: vi.fn() }));

import { useSession } from "next-auth/react";
import { AiAssistPopover } from "./AiAssistPopover";
import { useAIProvider } from "@/lib/stores/ai-provider";
import { useAiSession } from "@/lib/stores/ai-session";

const useSessionMock = vi.mocked(useSession);

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

function renderPopover(
  props: Partial<Parameters<typeof AiAssistPopover>[0]> = {},
) {
  const onInsert = vi.fn();
  render(
    <AiAssistPopover
      roadmapTitle="Frontend Developer"
      selected={{ id: "n1", label: "CSS Layout" }}
      existingChildren={["Flexbox"]}
      onInsert={onInsert}
      {...props}
    />,
  );
  // Popover starts closed — open it.
  fireEvent.click(screen.getByRole("button", { name: "AI assist" }));
  return { onInsert };
}

beforeEach(() => {
  useAIProvider.setState({ provider: "anthropic", keys: {}, models: {} });
  useAiSession.setState({ inputTokens: 0, outputTokens: 0 });
  localStorage.clear();
  useSessionMock.mockReturnValue({ status: "authenticated" } as never);
});
afterEach(() => vi.unstubAllGlobals());

describe("AiAssistPopover gating", () => {
  it("anonymous → login CTA carrying the current path as callbackUrl", () => {
    useSessionMock.mockReturnValue({ status: "unauthenticated" } as never);
    renderPopover();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login?callbackUrl=%2Feditor%2Fr1",
    );
  });

  it("authed but no key → connect-key card deep-linking to Settings", () => {
    renderPopover();
    expect(screen.getByRole("link", { name: "Connect key" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("no node selected → prompts you to select one", () => {
    useAIProvider.setState({
      provider: "anthropic",
      keys: { anthropic: "sk-x" },
      models: {},
    });
    renderPopover({ selected: null });
    expect(screen.getByText(/Select a node first/)).toBeInTheDocument();
  });
});

describe("AiAssistPopover flow", () => {
  beforeEach(() => {
    useAIProvider.setState({
      provider: "anthropic",
      keys: { anthropic: "sk-x" },
      models: {},
    });
  });

  it("generates, lets you deselect one, and inserts the chosen labels", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(
        jsonResponse({
          subtopics: ["Box model", "Positioning", "Grid"],
          usage: { inputTokens: 6, outputTokens: 4 },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { onInsert } = renderPopover();
    fireEvent.click(screen.getByRole("button", { name: "Suggest subtopics" }));

    await waitFor(() =>
      expect(screen.getByText("Box model")).toBeInTheDocument(),
    );
    // A real generation feeds the session token meter.
    expect(useAiSession.getState().inputTokens).toBe(6);

    // Request went to the subtopics route with the parent label + existing children.
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).toMatchObject({
      roadmapTitle: "Frontend Developer",
      parentLabel: "CSS Layout",
      existingChildren: ["Flexbox"],
    });

    // Uncheck "Positioning", then insert the remaining two under the selected node.
    fireEvent.click(screen.getByRole("checkbox", { name: "Positioning" }));
    fireEvent.click(screen.getByRole("button", { name: /Add 2 to canvas/ }));
    expect(onInsert).toHaveBeenCalledWith("n1", ["Box model", "Grid"]);
  });

  it("surfaces an actionable error from the route", async () => {
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
    renderPopover();
    fireEvent.click(screen.getByRole("button", { name: "Suggest subtopics" }));
    await waitFor(() =>
      expect(screen.getByText("That key was rejected.")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });
});
