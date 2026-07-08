import { describe, it, expect } from "vitest";
import {
  PROVIDERS,
  TIERS,
  PROVIDER_CATALOG,
  isProviderId,
  isTier,
} from "./catalog";

describe("provider catalog", () => {
  it("has a self-consistent entry for every provider", () => {
    for (const id of PROVIDERS) {
      expect(PROVIDER_CATALOG[id].id).toBe(id);
      expect(PROVIDER_CATALOG[id].label).toBeTruthy();
      expect(PROVIDER_CATALOG[id].keyPrefix).toBeTruthy();
    }
  });

  it("has non-empty model lists and a default that is a member of each tier", () => {
    for (const id of PROVIDERS) {
      const meta = PROVIDER_CATALOG[id];
      for (const tier of TIERS) {
        expect(meta.models[tier].length).toBeGreaterThan(0);
        expect(meta.models[tier]).toContain(meta.defaults[tier]);
      }
    }
  });

  it("guards provider ids and tiers", () => {
    expect(isProviderId("anthropic")).toBe(true);
    expect(isProviderId("nope")).toBe(false);
    expect(isTier("smart")).toBe(true);
    expect(isTier("nope")).toBe(false);
  });
});
