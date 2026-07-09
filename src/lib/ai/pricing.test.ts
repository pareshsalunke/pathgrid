import { describe, it, expect } from "vitest";
import { approxCostUsd, costLabel } from "./pricing";

describe("approxCostUsd", () => {
  it("prices a known model", () => {
    // 1M in @ $3 + 1M out @ $15
    expect(
      approxCostUsd("claude-sonnet-5", {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      }),
    ).toBe(18);
  });

  it("prices an openrouter slug by its model half", () => {
    expect(
      approxCostUsd("openai/gpt-4o-mini", {
        inputTokens: 1_000_000,
        outputTokens: 0,
      }),
    ).toBeCloseTo(0.15);
  });

  it("returns null for unknown models", () => {
    expect(
      approxCostUsd("some-custom-model", {
        inputTokens: 100,
        outputTokens: 100,
      }),
    ).toBeNull();
  });
});

describe("costLabel", () => {
  it("floors tiny costs to ~$0.01 and formats larger ones", () => {
    expect(
      costLabel("claude-haiku-4-5", { inputTokens: 1_000, outputTokens: 500 }),
    ).toBe("~$0.01");
    expect(
      costLabel("claude-opus-4-8", {
        inputTokens: 100_000,
        outputTokens: 100_000,
      }),
    ).toBe("~$3.00");
  });

  it("returns null when unpriceable", () => {
    expect(
      costLabel("mystery", { inputTokens: 10, outputTokens: 10 }),
    ).toBeNull();
  });
});
