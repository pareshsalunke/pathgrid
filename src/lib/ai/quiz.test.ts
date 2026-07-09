import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./registry", () => ({ getModel: vi.fn(() => "fake-fast-model") }));
vi.mock("ai", () => ({ generateText: vi.fn() }));

import { generateText } from "ai";
import { getModel } from "./registry";
import { generateQuiz } from "./quiz";
import { StructuredOutputError } from "./structured";

const generateTextMock = vi.mocked(generateText);
const getModelMock = vi.mocked(getModel);

const config = {
  provider: "anthropic" as const,
  apiKey: "sk",
  models: { smart: "s", fast: "f" },
};

function reply(text: string, inputTokens = 10, outputTokens = 20) {
  return { text, usage: { inputTokens, outputTokens } } as never;
}

const wrapped = (n = 5) =>
  JSON.stringify({
    questions: Array.from({ length: n }, (_, i) => ({
      q: `Q${i}`,
      options: ["a", "b", "c", "d"],
      answerIdx: i % 4,
      why: "because",
    })),
  });

const badJson = JSON.stringify({
  questions: [{ q: "Q", options: ["a", "b"], answerIdx: 0, why: "b" }],
});

beforeEach(() => {
  generateTextMock.mockReset();
  getModelMock.mockClear();
});

describe("generateQuiz", () => {
  it("runs on the fast model and returns the unwrapped questions + usage", async () => {
    generateTextMock.mockResolvedValueOnce(reply(wrapped(5)));
    const { questions, usage, repaired } = await generateQuiz({
      config,
      title: "Closures",
      context: "body",
    });

    expect(getModelMock).toHaveBeenCalledWith(config, "fast");
    expect(questions).toHaveLength(5);
    expect(questions[0]).toMatchObject({
      q: "Q0",
      options: ["a", "b", "c", "d"],
    });
    expect(repaired).toBe(false);
    expect(usage).toMatchObject({
      inputTokens: 10,
      outputTokens: 20,
      calls: 1,
    });
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it("repairs once on the fast model then succeeds", async () => {
    generateTextMock
      .mockResolvedValueOnce(reply(badJson))
      .mockResolvedValueOnce(reply(wrapped(5)));
    const { questions, usage, repaired } = await generateQuiz({
      config,
      title: "Closures",
      context: null,
    });

    expect(repaired).toBe(true);
    expect(questions).toHaveLength(5);
    expect(usage.calls).toBe(2);
    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });

  it("throws StructuredOutputError after a failed repair (issues only, no raw output)", async () => {
    generateTextMock
      .mockResolvedValueOnce(reply(badJson))
      .mockResolvedValueOnce(reply(badJson));
    await expect(
      generateQuiz({ config, title: "Closures", context: null }),
    ).rejects.toBeInstanceOf(StructuredOutputError);
  });
});
