"use client";

import { create } from "zustand";

/**
 * Token usage for the current browsing session (docs/05 §4 cost transparency;
 * the rail's "N tokens this session · ~$X" readout). Deliberately NOT persisted —
 * "this session" is literal; a reload starts the counter fresh.
 */

type AiSessionState = {
  inputTokens: number;
  outputTokens: number;
  addUsage: (usage: { inputTokens: number; outputTokens: number }) => void;
};

export const useAiSession = create<AiSessionState>()((set) => ({
  inputTokens: 0,
  outputTokens: 0,
  addUsage: (usage) =>
    set((s) => ({
      inputTokens: s.inputTokens + usage.inputTokens,
      outputTokens: s.outputTokens + usage.outputTokens,
    })),
}));
