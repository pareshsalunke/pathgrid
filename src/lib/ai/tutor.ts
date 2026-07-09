import "server-only";
import { streamText, generateText, type ModelMessage } from "ai";
import { getModel, type ProviderConfig } from "./registry";
import { summarizePrompts } from "./chat-prompts";

/**
 * Tutor-turn orchestrator (docs/06 §3.7, docs/05 §4). The onDelta callback keeps
 * transport (SSE) out of this core, mirroring generate-roadmap's onProgress.
 */

export type TutorMessage = { role: "user" | "assistant"; content: string };
export type TutorUsage = { inputTokens: number; outputTokens: number };

// Wallet-protection caps (docs/05 §4); the persona already asks for concision.
const CHAT_MAX_TOKENS = 2_000;
const SUMMARY_MAX_TOKENS = 600;

export async function runTutorTurn({
  config,
  system,
  history,
  message,
  onDelta,
}: {
  config: ProviderConfig;
  system: string;
  history: TutorMessage[];
  message: string;
  onDelta: (text: string) => void;
}): Promise<{ text: string; usage: TutorUsage }> {
  const model = getModel(config, "smart");
  const messages: ModelMessage[] = [
    ...history,
    { role: "user", content: message },
  ].map((m) =>
    m.role === "user"
      ? { role: "user", content: m.content }
      : { role: "assistant", content: m.content },
  );

  // ai@7: provider failures arrive as stream error parts — textStream silently
  // drops them and result.usage then rejects with a generic NoOutputGeneratedError,
  // hiding the provider statusCode. Capture the original via onError and rethrow
  // it so callers can map it (invalid_key / out_of_credit / …).
  let streamError: unknown;
  const result = streamText({
    model,
    system,
    messages,
    maxOutputTokens: CHAT_MAX_TOKENS,
    onError: ({ error }) => {
      streamError = error;
    },
  });

  let text = "";
  try {
    for await (const delta of result.textStream) {
      text += delta;
      onDelta(delta);
    }
  } catch (err) {
    // Transport-level stream failures do throw from the iterator.
    streamError ??= err;
  }
  if (streamError !== undefined) throw streamError;

  const usage = await result.usage;
  return {
    text,
    usage: {
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
    },
  };
}

/** Fold turns that scrolled out of the context window into the rolling summary
 *  (fast tier — doc 05 §4 tier table). */
export async function summarizeThread({
  config,
  priorSummary,
  messages,
}: {
  config: ProviderConfig;
  priorSummary: string | null;
  messages: TutorMessage[];
}): Promise<{ summary: string; usage: TutorUsage }> {
  const model = getModel(config, "fast");
  const { system, prompt } = summarizePrompts({ priorSummary, messages });
  const result = await generateText({
    model,
    system,
    prompt,
    maxOutputTokens: SUMMARY_MAX_TOKENS,
  });
  return {
    summary: result.text.trim(),
    usage: {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    },
  };
}
