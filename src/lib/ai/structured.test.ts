import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("ai", () => ({ generateText: vi.fn() }));

import { generateText } from "ai";
import { generateStructured, StructuredOutputError } from "./structured";

const generateTextMock = vi.mocked(generateText);

const schema = z.object({ name: z.string(), count: z.number() });

function reply(text: string, inputTokens = 100, outputTokens = 50) {
  return { text, usage: { inputTokens, outputTokens } } as never;
}

function args() {
  return {
    model: "smart-model" as never,
    repairModel: "fast-model" as never,
    system: "sys",
    prompt: "make json",
    schema,
    maxOutputTokens: 1000,
  };
}

beforeEach(() => {
  generateTextMock.mockReset();
});

describe("generateStructured", () => {
  it("returns validated data from clean JSON (no repair)", async () => {
    generateTextMock.mockResolvedValueOnce(reply('{"name":"a","count":1}'));
    const result = await generateStructured(args());
    expect(result.data).toEqual({ name: "a", count: 1 });
    expect(result.repaired).toBe(false);
    expect(result.usage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      calls: 1,
    });
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it("strips ```json fences before parsing", async () => {
    generateTextMock.mockResolvedValueOnce(
      reply('```json\n{"name":"a","count":2}\n```'),
    );
    const result = await generateStructured(args());
    expect(result.data.count).toBe(2);
    expect(result.repaired).toBe(false);
  });

  it("repairs once on the repair model with the errors pasted in", async () => {
    generateTextMock
      .mockResolvedValueOnce(reply('{"name":"a","count":"NaN"}')) // Zod fail
      .mockResolvedValueOnce(reply('{"name":"a","count":3}'));
    const result = await generateStructured(args());
    expect(result.data.count).toBe(3);
    expect(result.repaired).toBe(true);
    expect(result.usage.calls).toBe(2);
    expect(result.usage.inputTokens).toBe(200);

    const repairCall = generateTextMock.mock.calls[1][0];
    expect(repairCall.model).toBe("fast-model"); // fast tier per docs/05 §4
    expect(String(repairCall.prompt)).toContain("failed validation");
    expect(String(repairCall.prompt)).toContain("count");
  });

  it("repairs a JSON parse failure too", async () => {
    generateTextMock
      .mockResolvedValueOnce(reply("not json at all"))
      .mockResolvedValueOnce(reply('{"name":"b","count":4}'));
    const result = await generateStructured(args());
    expect(result.data).toEqual({ name: "b", count: 4 });
    expect(result.repaired).toBe(true);
  });

  it("throws StructuredOutputError after a failed repair, with issues + usage", async () => {
    generateTextMock
      .mockResolvedValueOnce(reply('{"count":"x"}'))
      .mockResolvedValueOnce(reply('{"count":"still wrong"}'));
    const err = await generateStructured(args()).catch((e) => e);
    expect(err).toBeInstanceOf(StructuredOutputError);
    expect(err.issues.length).toBeGreaterThan(0);
    expect(err.usage.calls).toBe(2);
    // Raw model output never rides on the error.
    expect(JSON.stringify(err.issues)).not.toContain("still wrong");
  });

  it("propagates provider errors from the first call untouched", async () => {
    const boom = Object.assign(new Error("401 unauthorized"), {
      statusCode: 401,
    });
    generateTextMock.mockRejectedValueOnce(boom);
    await expect(generateStructured(args())).rejects.toBe(boom);
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });
});
