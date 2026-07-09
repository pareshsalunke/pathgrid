import { describe, it, expect, beforeEach } from "vitest";
import { useAiSession } from "./ai-session";

describe("useAiSession", () => {
  beforeEach(() => {
    useAiSession.setState({ inputTokens: 0, outputTokens: 0 });
    localStorage.clear();
  });

  it("accumulates usage across generations", () => {
    useAiSession.getState().addUsage({ inputTokens: 100, outputTokens: 50 });
    useAiSession.getState().addUsage({ inputTokens: 10, outputTokens: 5 });
    const s = useAiSession.getState();
    expect(s.inputTokens).toBe(110);
    expect(s.outputTokens).toBe(55);
  });

  it("is session-only — nothing persisted to localStorage", () => {
    useAiSession.getState().addUsage({ inputTokens: 1, outputTokens: 1 });
    expect(localStorage.length).toBe(0);
  });
});
