import "server-only";
import { generateText, type LanguageModel } from "ai";
import type { z } from "zod";

/**
 * Structured-output helper (docs/05 §4): generate → parse → Zod validate → on
 * failure ONE automatic repair call with the validator errors pasted in → validate
 * again or fail loudly. The repair pass runs on the caller's fast-tier model
 * (docs/05 §4 tier table); per-call maxOutputTokens caps protect the user's wallet.
 *
 * Errors never carry the raw model output (BYOK privacy: nothing model-generated
 * is logged server-side) — only Zod issue paths/messages.
 */

export type UsageTotals = {
  inputTokens: number;
  outputTokens: number;
  calls: number;
};

export class StructuredOutputError extends Error {
  readonly issues: string[];
  readonly usage: UsageTotals;
  constructor(message: string, issues: string[], usage: UsageTotals) {
    super(message);
    this.name = "StructuredOutputError";
    this.issues = issues;
    this.usage = usage;
  }
}

type GenerateStructuredArgs<Schema extends z.ZodType> = {
  /** Primary model for the generation call (usually the smart tier). */
  model: LanguageModel;
  /** Model for the single repair pass (fast tier per docs/05 §4). */
  repairModel: LanguageModel;
  system: string;
  prompt: string;
  schema: Schema;
  maxOutputTokens: number;
};

export type GenerateStructuredResult<T> = {
  data: T;
  usage: UsageTotals;
  repaired: boolean;
};

export async function generateStructured<Schema extends z.ZodType>(
  args: GenerateStructuredArgs<Schema>,
): Promise<GenerateStructuredResult<z.infer<Schema>>> {
  const usage: UsageTotals = { inputTokens: 0, outputTokens: 0, calls: 0 };

  const first = await callModel(
    args.model,
    args.system,
    args.prompt,
    args,
    usage,
  );
  const attempt = tryParse(first, args.schema);
  if (attempt.ok) return { data: attempt.data, usage, repaired: false };

  // One repair pass (docs/05 §4 step 3): paste the errors + the failed output back.
  const repairPrompt = [
    "This JSON failed validation with these errors:",
    ...attempt.issues.map((i) => `- ${i}`),
    "",
    "Original JSON:",
    first,
    "",
    "Return the corrected JSON only — no prose, no code fences.",
  ].join("\n");
  const second = await callModel(
    args.repairModel,
    args.system,
    repairPrompt,
    args,
    usage,
  );
  const retry = tryParse(second, args.schema);
  if (retry.ok) return { data: retry.data, usage, repaired: true };

  // Fail loudly (docs/05 §4 step 4): surface issues, never the raw output.
  throw new StructuredOutputError(
    "structured output failed validation after one repair pass",
    retry.issues,
    usage,
  );
}

async function callModel(
  model: LanguageModel,
  system: string,
  prompt: string,
  args: { maxOutputTokens: number },
  usage: UsageTotals,
): Promise<string> {
  const result = await generateText({
    model,
    system,
    prompt,
    maxOutputTokens: args.maxOutputTokens,
  });
  usage.inputTokens += result.usage.inputTokens ?? 0;
  usage.outputTokens += result.usage.outputTokens ?? 0;
  usage.calls += 1;
  return result.text;
}

type ParseAttempt<T> = { ok: true; data: T } | { ok: false; issues: string[] };

function tryParse<Schema extends z.ZodType>(
  text: string,
  schema: Schema,
): ParseAttempt<z.infer<Schema>> {
  let json: unknown;
  try {
    json = JSON.parse(stripFences(text));
  } catch (err) {
    return {
      ok: false,
      issues: [
        `invalid JSON: ${err instanceof Error ? err.message : "parse error"}`,
      ],
    };
  }
  const parsed = schema.safeParse(json);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    issues: parsed.error.issues.map(
      (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
    ),
  };
}

/** Models often wrap JSON in ```json fences despite instructions — strip them. */
function stripFences(text: string): string {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  return match ? match[1] : trimmed;
}
