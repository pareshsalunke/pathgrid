import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { isProviderId, type Tier } from "./catalog";
import { AI_HEADERS, type AiRequestConfig } from "./headers";

/**
 * BYOK provider registry (docs/05 §4). Resolves the caller's provider + models from
 * the request transport headers and instantiates a Vercel-AI-SDK model on demand.
 *
 * Security contract: the API key arrives per request, lives here in memory for the
 * duration of the call, and is passed straight to the provider client. It is never
 * persisted, never logged, and no module-level client ever holds a user key.
 */

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** The caller's config for one request (provider + key + a model per tier). */
export type ProviderConfig = AiRequestConfig;

/**
 * Read the provider config from the AI transport headers
 * (x-ai-provider / x-ai-model-smart / x-ai-model-fast / Authorization: Bearer <key>).
 * Returns null when anything required is missing; the caller maps null to
 * `{ error: "no_provider_key" }` (docs/04 §4), which every UI deep-links to Settings.
 */
export function resolveProviderConfig(req: Request): ProviderConfig | null {
  const provider = req.headers.get(AI_HEADERS.provider);
  if (!provider || !isProviderId(provider)) return null;

  const apiKey = readBearer(req.headers.get("authorization"));
  if (!apiKey) return null;

  const smart = req.headers.get(AI_HEADERS.smart)?.trim();
  const fast = req.headers.get(AI_HEADERS.fast)?.trim();
  if (!smart || !fast) return null;

  return { provider, apiKey, models: { smart, fast } };
}

/**
 * Instantiate the caller's model for a tier. A fresh provider client is created per
 * call with the passed key — never a cached/singleton client holding a user key.
 */
export function getModel(config: ProviderConfig, tier: Tier): LanguageModel {
  const model = config.models[tier];
  const { apiKey } = config;
  switch (config.provider) {
    case "anthropic":
      return createAnthropic({ apiKey })(model);
    case "openai":
      return createOpenAI({ apiKey })(model);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(model);
    case "openrouter":
      return createOpenAI({ apiKey, baseURL: OPENROUTER_BASE_URL })(model);
  }
}

function readBearer(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token ? token : null;
}
