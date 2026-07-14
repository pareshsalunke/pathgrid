import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./registry", () => ({ getModel: vi.fn(() => "fake-fast-model") }));
vi.mock("ai", () => ({ generateText: vi.fn() }));

import { generateText } from "ai";
import { getModel } from "./registry";
import { generateSubtopics } from "./subtopics";
import { StructuredOutputError } from "./structured";

const generateTextMock = vi.mocked(generateText);
const getModelMock = vi.mocked(getModel);

const config = {
  provider: "anthropic" as const,
  apiKey: "sk",
  models: { smart: "s", fast: "f" },
};

function reply(text: string, inputTokens = 8, outputTokens = 12) {
  return { text, usage: { inputTokens, outputTokens } } as never;
}

const wrapped = JSON.stringify({
  subtopics: ["Flex container", "flex-direction", "justify-content"],
});
const badJson = JSON.stringify({ subtopics: [] }); // fails min(1)

beforeEach(() => {
  generateTextMock.mockReset();
  getModelMock.mockClear();
});

describe("generateSubtopics", () => {
  it("runs on the fast model and returns the unwrapped titles + usage", async () => {
    generateTextMock.mockResolvedValueOnce(reply(wrapped));
    const { subtopics, usage, repaired } = await generateSubtopics({
      config,
      roadmapTitle: "Frontend",
      parentLabel: "Flexbox",
      existingChildren: [],
    });

    expect(getModelMock).toHaveBeenCalledWith(config, "fast");
    expect(subtopics).toEqual([
      "Flex container",
      "flex-direction",
      "justify-content",
    ]);
    expect(repaired).toBe(false);
    expect(usage).toMatchObject({ inputTokens: 8, outputTokens: 12, calls: 1 });
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it("throws StructuredOutputError after a failed repair (fast repair pass)", async () => {
    generateTextMock
      .mockResolvedValueOnce(reply(badJson))
      .mockResolvedValueOnce(reply(badJson));
    await expect(
      generateSubtopics({
        config,
        roadmapTitle: "R",
        parentLabel: "P",
        existingChildren: [],
      }),
    ).rejects.toBeInstanceOf(StructuredOutputError);
    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });
});
