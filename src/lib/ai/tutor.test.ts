import { describe, it, expect, vi, beforeEach } from "vitest";
import { streamText, generateText } from "ai";
import { getModel } from "./registry";
import { runTutorTurn, summarizeThread } from "./tutor";
import type { ProviderConfig } from "./registry";

// tutor.ts is server-only; neutralize the guard so it imports under Vitest.
vi.mock("server-only", () => ({}));
vi.mock("ai", () => ({ streamText: vi.fn(), generateText: vi.fn() }));
vi.mock("./registry", () => ({ getModel: vi.fn() }));

const streamTextMock = vi.mocked(streamText);
const generateTextMock = vi.mocked(generateText);
const getModelMock = vi.mocked(getModel);

const config = {
  provider: "anthropic",
  apiKey: "sk-test",
  models: { smart: "smart-model", fast: "fast-model" },
} as ProviderConfig;

async function* deltas(...parts: string[]) {
  for (const p of parts) yield p;
}

function fakeStream(args: {
  parts?: string[];
  usage?: { inputTokens?: number; outputTokens?: number };
  usageRejects?: boolean;
  throwMidStream?: unknown;
}) {
  const textStream = args.throwMidStream
    ? (async function* () {
        yield "partial ";
        throw args.throwMidStream;
      })()
    : deltas(...(args.parts ?? []));
  let usage: Promise<unknown>;
  if (args.usageRejects) {
    usage = Promise.reject(new Error("No output generated."));
    usage.catch(() => {}); // mark handled; awaiting it still rejects
  } else {
    usage = Promise.resolve(args.usage ?? {});
  }
  return { textStream, usage } as unknown as ReturnType<typeof streamText>;
}

beforeEach(() => {
  vi.clearAllMocks();
  getModelMock.mockImplementation((_cfg, tier) => ({ modelId: tier }) as never);
});

describe("runTutorTurn", () => {
  it("streams deltas, returns full text + coalesced usage on the smart tier", async () => {
    streamTextMock.mockReturnValue(
      fakeStream({
        parts: ["Start ", "with A."],
        usage: { inputTokens: 100, outputTokens: 20 },
      }),
    );

    const seen: string[] = [];
    const out = await runTutorTurn({
      config,
      system: "SYSTEM",
      history: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
      ],
      message: "what next?",
      onDelta: (t) => seen.push(t),
    });

    expect(seen).toEqual(["Start ", "with A."]);
    expect(out).toEqual({
      text: "Start with A.",
      usage: { inputTokens: 100, outputTokens: 20 },
    });

    expect(getModelMock).toHaveBeenCalledWith(config, "smart");
    const call = streamTextMock.mock.calls[0][0];
    expect(call.system).toBe("SYSTEM");
    expect(call.messages).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
      { role: "user", content: "what next?" },
    ]);
    expect(call.maxOutputTokens).toBe(2000);
  });

  it("defaults missing usage numbers to 0", async () => {
    streamTextMock.mockReturnValue(fakeStream({ parts: ["ok"], usage: {} }));
    const out = await runTutorTurn({
      config,
      system: "s",
      history: [],
      message: "m",
      onDelta: () => {},
    });
    expect(out.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it("rethrows the ORIGINAL provider error captured via onError (invalid key path)", async () => {
    const providerError = Object.assign(new Error("401 unauthorized"), {
      statusCode: 401,
    });
    streamTextMock.mockImplementation((opts) => {
      // ai@7 routes provider failures to onError; textStream ends cleanly and
      // the result promises reject with a generic error.
      (opts.onError as (e: { error: unknown }) => void)({
        error: providerError,
      });
      return fakeStream({ parts: [], usageRejects: true });
    });

    await expect(
      runTutorTurn({
        config,
        system: "s",
        history: [],
        message: "m",
        onDelta: () => {},
      }),
    ).rejects.toBe(providerError);
  });

  it("rethrows transport errors thrown mid-stream", async () => {
    const boom = new Error("socket hang up");
    streamTextMock.mockReturnValue(fakeStream({ throwMidStream: boom }));

    await expect(
      runTutorTurn({
        config,
        system: "s",
        history: [],
        message: "m",
        onDelta: () => {},
      }),
    ).rejects.toBe(boom);
  });
});

describe("summarizeThread", () => {
  it("runs on the fast tier and returns the trimmed summary + usage", async () => {
    generateTextMock.mockResolvedValue({
      text: "  Learner knows JS.  ",
      usage: { inputTokens: 50, outputTokens: 12 },
    } as never);

    const out = await summarizeThread({
      config,
      priorSummary: null,
      messages: [{ role: "user", content: "hi" }],
    });

    expect(out).toEqual({
      summary: "Learner knows JS.",
      usage: { inputTokens: 50, outputTokens: 12 },
    });
    expect(getModelMock).toHaveBeenCalledWith(config, "fast");
    const call = generateTextMock.mock.calls[0][0];
    expect(call.maxOutputTokens).toBe(600);
    expect(call.prompt).toContain("user: hi");
  });
});
