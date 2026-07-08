import type { ProviderId, Tier } from "./catalog";

/**
 * BYOK transport contract (docs/04 §4, extended to two tiers — see docs/DECISIONS.md).
 * Client-safe: pure header building, no SDK. Shared by the browser (which sends these
 * headers) and the server registry (which reads them) so the two can't drift.
 *
 * The key rides in the Authorization header to our *own* AI routes, which forward it
 * to the provider. It is never written to our DB or logs.
 */

export const AI_HEADERS = {
  provider: "x-ai-provider",
  smart: "x-ai-model-smart",
  fast: "x-ai-model-fast",
} as const;

export type AiRequestConfig = {
  provider: ProviderId;
  apiKey: string;
  models: Record<Tier, string>;
};

export function aiRequestHeaders(
  config: AiRequestConfig,
): Record<string, string> {
  return {
    [AI_HEADERS.provider]: config.provider,
    [AI_HEADERS.smart]: config.models.smart,
    [AI_HEADERS.fast]: config.models.fast,
    Authorization: `Bearer ${config.apiKey}`,
  };
}
