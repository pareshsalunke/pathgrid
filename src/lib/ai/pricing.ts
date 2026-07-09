/**
 * Static price table for the session-cost display (docs/05 §4: "tokens and an
 * approximate cost from a static price table"). USD per 1M tokens, covering the
 * catalog's seed models only — unknown models return null and the UI shows
 * tokens without a cost. Deliberately tiny: prices drift, the override models
 * are unknowable, and this is a courtesy estimate, not billing.
 */

type Price = { in: number; out: number };

const PRICES: Record<string, Price> = {
  // Anthropic (per claude-api reference)
  "claude-sonnet-5": { in: 3, out: 15 },
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-opus-4-7": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
  // OpenAI seeds
  "gpt-4o": { in: 2.5, out: 10 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  // Google seeds
  "gemini-1.5-pro": { in: 1.25, out: 5 },
  "gemini-1.5-flash": { in: 0.075, out: 0.3 },
};

/** Approximate USD cost, or null when the model isn't in the table. */
export function approxCostUsd(
  model: string,
  usage: { inputTokens: number; outputTokens: number },
): number | null {
  // OpenRouter slugs are "vendor/model" — price by the model half when known.
  const price = PRICES[model] ?? PRICES[model.split("/").pop() ?? ""];
  if (!price) return null;
  return (
    (usage.inputTokens / 1_000_000) * price.in +
    (usage.outputTokens / 1_000_000) * price.out
  );
}

/** "~$0.013" / "~$1.20" style label, or null when unpriceable. */
export function costLabel(
  model: string,
  usage: { inputTokens: number; outputTokens: number },
): string | null {
  const cost = approxCostUsd(model, usage);
  if (cost === null) return null;
  if (cost > 0 && cost < 0.01) return "~$0.01";
  return `~$${cost.toFixed(2)}`;
}
