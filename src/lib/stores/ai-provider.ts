"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PROVIDER_CATALOG, type ProviderId, type Tier } from "@/lib/ai/catalog";
import type { AiRequestConfig } from "@/lib/ai/headers";

/**
 * BYOK config, per-device in localStorage — the sanctioned home for user API keys
 * (docs/05 §4: keys live in the browser, never our DB or logs). Built on the same
 * Zustand + persist pattern as `useProgress`. Shape: the active provider, plus a key
 * and a {smart,fast} model choice held per provider so switching providers is lossless.
 */

type ModelPick = Record<Tier, string>;

type AIProviderState = {
  provider: ProviderId;
  keys: Partial<Record<ProviderId, string>>;
  models: Partial<Record<ProviderId, ModelPick>>;
  setProvider: (provider: ProviderId) => void;
  setKey: (provider: ProviderId, key: string) => void;
  setModel: (provider: ProviderId, tier: Tier, model: string) => void;
  clearKey: (provider: ProviderId) => void;
};

export const useAIProvider = create<AIProviderState>()(
  persist(
    (set) => ({
      provider: "anthropic",
      keys: {},
      models: {},
      setProvider: (provider) => set({ provider }),
      setKey: (provider, key) =>
        set((s) => ({ keys: { ...s.keys, [provider]: key } })),
      setModel: (provider, tier, model) =>
        set((s) => ({
          models: {
            ...s.models,
            [provider]: { ...modelsFor(s, provider), [tier]: model },
          },
        })),
      clearKey: (provider) =>
        set((s) => {
          const keys = { ...s.keys };
          delete keys[provider];
          return { keys };
        }),
    }),
    { name: "pathgrid-ai", version: 1 },
  ),
);

/** Selected {smart,fast} models for a provider, falling back to catalog defaults. */
export function modelsFor(
  state: Pick<AIProviderState, "models">,
  provider: ProviderId,
): ModelPick {
  const picked = state.models[provider];
  const { defaults } = PROVIDER_CATALOG[provider];
  return {
    smart: picked?.smart ?? defaults.smart,
    fast: picked?.fast ?? defaults.fast,
  };
}

/**
 * The request config for the active provider, or null when it has no key yet.
 * Feeds `aiRequestHeaders` for the Test-key call and every future AI fetch.
 */
export function currentAiConfig(
  state: Pick<AIProviderState, "provider" | "keys" | "models">,
): AiRequestConfig | null {
  const apiKey = state.keys[state.provider]?.trim();
  if (!apiKey) return null;
  const picks = modelsFor(state, state.provider);
  const { defaults } = PROVIDER_CATALOG[state.provider];
  return {
    provider: state.provider,
    apiKey,
    // Coerce an empty custom model back to the default so the transport never
    // carries a blank model id.
    models: {
      smart: picks.smart || defaults.smart,
      fast: picks.fast || defaults.fast,
    },
  };
}
