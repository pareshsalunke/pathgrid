import { PROVIDER_CATALOG, isProviderId } from "@/lib/ai/catalog";
import type { ProviderConfig } from "@/lib/ai/registry";

/**
 * Pipeline provider config — YOUR key from .env, never a user BYOK key (docs/06 §5:
 * "keep the two code paths physically separate"). Models default to the provider's
 * catalog defaults; override per run via PIPELINE_MODEL_SMART / PIPELINE_MODEL_FAST.
 */
export function pipelineProviderConfig(): ProviderConfig {
  const provider = process.env.PIPELINE_PROVIDER?.trim() || "anthropic";
  if (!isProviderId(provider)) {
    throw new Error(
      `PIPELINE_PROVIDER '${provider}' is not one of: anthropic, openai, google, openrouter`,
    );
  }

  const apiKey = process.env.PIPELINE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "PIPELINE_API_KEY is not set. The seeding pipeline runs on your own key from .env " +
        "(a separate path from user BYOK keys) — see .env.example.",
    );
  }

  const defaults = PROVIDER_CATALOG[provider].defaults;
  return {
    provider,
    apiKey,
    models: {
      smart: process.env.PIPELINE_MODEL_SMART?.trim() || defaults.smart,
      fast: process.env.PIPELINE_MODEL_FAST?.trim() || defaults.fast,
    },
  };
}
