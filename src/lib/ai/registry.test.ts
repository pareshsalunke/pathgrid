import { describe, it, expect, vi } from "vitest";

// registry.ts is server-only; neutralize the guard so it imports under Vitest.
vi.mock("server-only", () => ({}));

import { resolveProviderConfig, getModel } from "./registry";
import { AI_HEADERS } from "./headers";
import { PROVIDERS } from "./catalog";

function req(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/ai/test-key", {
    method: "POST",
    headers,
  });
}

describe("resolveProviderConfig", () => {
  it("parses provider, bearer key, and both tier models", () => {
    const config = resolveProviderConfig(
      req({
        [AI_HEADERS.provider]: "anthropic",
        [AI_HEADERS.smart]: "claude-sonnet-5",
        [AI_HEADERS.fast]: "claude-haiku-4-5",
        authorization: "Bearer sk-ant-123",
      }),
    );
    expect(config).toEqual({
      provider: "anthropic",
      apiKey: "sk-ant-123",
      models: { smart: "claude-sonnet-5", fast: "claude-haiku-4-5" },
    });
  });

  it("returns null for a missing or unknown provider", () => {
    const base = {
      [AI_HEADERS.smart]: "a",
      [AI_HEADERS.fast]: "b",
      authorization: "Bearer k",
    };
    expect(resolveProviderConfig(req(base))).toBeNull();
    expect(
      resolveProviderConfig(req({ ...base, [AI_HEADERS.provider]: "nope" })),
    ).toBeNull();
  });

  it("returns null when the key or a tier model is missing", () => {
    expect(
      resolveProviderConfig(
        req({
          [AI_HEADERS.provider]: "openai",
          [AI_HEADERS.smart]: "gpt-4o",
          [AI_HEADERS.fast]: "gpt-4o-mini",
        }),
      ),
    ).toBeNull();
    expect(
      resolveProviderConfig(
        req({
          [AI_HEADERS.provider]: "openai",
          authorization: "Bearer k",
          [AI_HEADERS.fast]: "gpt-4o-mini",
        }),
      ),
    ).toBeNull();
  });

  it("ignores a non-Bearer authorization header", () => {
    expect(
      resolveProviderConfig(
        req({
          [AI_HEADERS.provider]: "openai",
          [AI_HEADERS.smart]: "gpt-4o",
          [AI_HEADERS.fast]: "gpt-4o-mini",
          authorization: "sk-plain",
        }),
      ),
    ).toBeNull();
  });
});

describe("getModel", () => {
  it("instantiates a model for every provider without throwing", () => {
    for (const provider of PROVIDERS) {
      const model = getModel(
        {
          provider,
          apiKey: "test-key",
          models: { smart: "m-smart", fast: "m-fast" },
        },
        "smart",
      );
      expect(model).toBeTruthy();
    }
  });
});
