import { describe, it, expect } from "vitest";
import { mapProviderError } from "./errors";

describe("mapProviderError", () => {
  it("maps HTTP status codes to actionable codes", () => {
    expect(mapProviderError({ statusCode: 401 }).code).toBe("invalid_key");
    expect(mapProviderError({ statusCode: 403 }).code).toBe("invalid_key");
    expect(mapProviderError({ statusCode: 402 }).code).toBe("out_of_credit");
    expect(mapProviderError({ statusCode: 404 }).code).toBe(
      "model_unavailable",
    );
    expect(mapProviderError({ statusCode: 429 }).code).toBe("rate_limited");
  });

  it("reads .status when .statusCode is absent", () => {
    expect(mapProviderError({ status: 429 }).code).toBe("rate_limited");
  });

  it("falls back to keyword sniffing on the message", () => {
    expect(mapProviderError(new Error("Invalid API key")).code).toBe(
      "invalid_key",
    );
    expect(mapProviderError(new Error("insufficient quota")).code).toBe(
      "out_of_credit",
    );
    expect(mapProviderError(new Error("no such model: foo")).code).toBe(
      "model_unavailable",
    );
    expect(mapProviderError(new Error("Rate limit exceeded")).code).toBe(
      "rate_limited",
    );
  });

  it("returns unknown for unrecognized errors, always with a message", () => {
    const mapped = mapProviderError(new Error("boom"));
    expect(mapped.code).toBe("unknown");
    expect(mapped.message).toBeTruthy();
  });

  it("never throws on odd inputs", () => {
    expect(mapProviderError(null).code).toBe("unknown");
    expect(mapProviderError(undefined).code).toBe("unknown");
    expect(mapProviderError("weird").code).toBe("unknown");
    expect(mapProviderError(42).code).toBe("unknown");
  });
});
