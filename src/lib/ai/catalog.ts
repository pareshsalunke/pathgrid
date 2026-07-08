/**
 * BYOK provider + model catalog (docs/05 §4, docs/06 §5).
 *
 * Pure data + types — **no SDK imports** — so this module is safe to import from
 * client code (the Settings UI + the Zustand store) *and* from the server registry.
 * The lists are a "small static catalog per provider plus a free-text override"
 * (docs/05 §4): they seed the Settings dropdowns; users can type any model id the
 * catalog omits, so exact ids here are convenience, not correctness.
 */

export const PROVIDERS = [
  "anthropic",
  "openai",
  "google",
  "openrouter",
] as const;
export type ProviderId = (typeof PROVIDERS)[number];

/** Two tiers cover every runtime call (docs/05 §4): `smart` for graphs/content/chat,
 *  `fast` for quizzes + the JSON repair pass. */
export const TIERS = ["smart", "fast"] as const;
export type Tier = (typeof TIERS)[number];

export type ProviderMeta = {
  id: ProviderId;
  /** Display name in the Settings picker. */
  label: string;
  /** Client-side format hint for the key field only — never treated as proof of validity. */
  keyPrefix: string;
  keyPlaceholder: string;
  /** Static suggestions per tier; the UI adds a free-text "Custom…" option on top. */
  models: Record<Tier, string[]>;
  /** Sensible default model per tier (always a member of the matching `models` list). */
  defaults: Record<Tier, string>;
};

export const PROVIDER_CATALOG: Record<ProviderId, ProviderMeta> = {
  // Anthropic model ids verified against the claude-api reference (aliases, no date
  // suffix). smart = Sonnet-tier, fast = Haiku, per the docs/05 §4 tier table.
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    keyPrefix: "sk-ant-",
    keyPlaceholder: "sk-ant-…",
    models: {
      smart: [
        "claude-sonnet-5",
        "claude-opus-4-8",
        "claude-opus-4-7",
        "claude-sonnet-4-6",
      ],
      fast: ["claude-haiku-4-5"],
    },
    defaults: { smart: "claude-sonnet-5", fast: "claude-haiku-4-5" },
  },
  // Non-Anthropic defaults below are intentionally conservative, long-lived ids so a
  // fresh BYOK key works on first use; newer models are reachable via the free-text
  // override rather than by editing this file.
  openai: {
    id: "openai",
    label: "OpenAI",
    keyPrefix: "sk-",
    keyPlaceholder: "sk-…",
    models: {
      smart: ["gpt-4o"],
      fast: ["gpt-4o-mini"],
    },
    defaults: { smart: "gpt-4o", fast: "gpt-4o-mini" },
  },
  google: {
    id: "google",
    label: "Google",
    keyPrefix: "AI",
    keyPlaceholder: "AIza…",
    models: {
      smart: ["gemini-1.5-pro"],
      fast: ["gemini-1.5-flash"],
    },
    defaults: { smart: "gemini-1.5-pro", fast: "gemini-1.5-flash" },
  },
  // OpenRouter uses provider-prefixed slugs and reaches every model; these are stable
  // seeds — the override carries the long tail.
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    keyPrefix: "sk-or-",
    keyPlaceholder: "sk-or-…",
    models: {
      smart: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o"],
      fast: ["openai/gpt-4o-mini", "anthropic/claude-3.5-haiku"],
    },
    defaults: {
      smart: "anthropic/claude-3.5-sonnet",
      fast: "openai/gpt-4o-mini",
    },
  },
};

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDERS as readonly string[]).includes(value);
}

export function isTier(value: string): value is Tier {
  return (TIERS as readonly string[]).includes(value);
}
