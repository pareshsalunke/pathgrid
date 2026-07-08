import { describe, it, expect, beforeEach } from "vitest";
import { useAIProvider, modelsFor, currentAiConfig } from "./ai-provider";
import { PROVIDER_CATALOG } from "@/lib/ai/catalog";

describe("useAIProvider store", () => {
  beforeEach(() => {
    useAIProvider.setState({ provider: "anthropic", keys: {}, models: {} });
    localStorage.clear();
  });

  it("switches the active provider", () => {
    useAIProvider.getState().setProvider("openai");
    expect(useAIProvider.getState().provider).toBe("openai");
  });

  it("keeps keys and models isolated per provider", () => {
    const s = useAIProvider.getState();
    s.setKey("anthropic", "sk-ant-1");
    s.setKey("openai", "sk-oa-1");
    s.setModel("openai", "smart", "gpt-4o");
    const state = useAIProvider.getState();
    expect(state.keys).toEqual({ anthropic: "sk-ant-1", openai: "sk-oa-1" });
    expect(state.models.openai?.smart).toBe("gpt-4o");
    expect(state.models.anthropic).toBeUndefined();
  });

  it("clearKey removes only that provider's key", () => {
    const s = useAIProvider.getState();
    s.setKey("anthropic", "a");
    s.setKey("openai", "b");
    s.clearKey("anthropic");
    expect(useAIProvider.getState().keys).toEqual({ openai: "b" });
  });

  it("modelsFor falls back to catalog defaults when unset", () => {
    expect(modelsFor({ models: {} }, "anthropic")).toEqual(
      PROVIDER_CATALOG.anthropic.defaults,
    );
  });

  it("currentAiConfig is null without a key, populated (trimmed) with one", () => {
    expect(currentAiConfig(useAIProvider.getState())).toBeNull();
    useAIProvider.getState().setKey("anthropic", "  sk-ant-1  ");
    const cfg = currentAiConfig(useAIProvider.getState());
    expect(cfg).toMatchObject({ provider: "anthropic", apiKey: "sk-ant-1" });
    expect(cfg?.models.smart).toBe(PROVIDER_CATALOG.anthropic.defaults.smart);
  });

  it("currentAiConfig coerces an empty custom model back to the default", () => {
    const s = useAIProvider.getState();
    s.setKey("anthropic", "k");
    s.setModel("anthropic", "smart", "");
    expect(currentAiConfig(useAIProvider.getState())?.models.smart).toBe(
      PROVIDER_CATALOG.anthropic.defaults.smart,
    );
  });
});
