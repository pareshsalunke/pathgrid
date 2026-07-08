/**
 * Map a provider/SDK error to an actionable code + human message (docs/05 §4:
 * "surface provider errors as actionable messages … rather than generic failures").
 *
 * Dependency-free and defensive: reads the HTTP status off the error object and
 * falls back to keyword sniffing on the message. **Never** returns the raw provider
 * response body or anything derived from the user's key.
 */

export type ProviderErrorCode =
  | "invalid_key"
  | "out_of_credit"
  | "model_unavailable"
  | "rate_limited"
  | "unknown";

export type MappedProviderError = { code: ProviderErrorCode; message: string };

const MESSAGES: Record<ProviderErrorCode, string> = {
  invalid_key: "That key was rejected. Check it and try again.",
  out_of_credit: "Your provider account is out of credit or over its quota.",
  model_unavailable:
    "That model isn't available on your account. Pick another in Settings.",
  rate_limited:
    "The provider is rate-limiting requests. Wait a moment and retry.",
  unknown: "Couldn't reach the provider. Check the key and try again.",
};

export function mapProviderError(err: unknown): MappedProviderError {
  const status = statusOf(err);
  if (status === 401 || status === 403) return mapped("invalid_key");
  if (status === 402) return mapped("out_of_credit");
  if (status === 404) return mapped("model_unavailable");
  if (status === 429) return mapped("rate_limited");

  const text = messageOf(err).toLowerCase();
  if (/invalid.*key|api key|unauthorized|authentication|401/.test(text))
    return mapped("invalid_key");
  if (/quota|credit|billing|insufficient|payment|402/.test(text))
    return mapped("out_of_credit");
  if (
    /no such model|model.*(not found|not exist|unavailable|unsupported)/.test(
      text,
    )
  )
    return mapped("model_unavailable");
  if (/rate.?limit|too many requests|overloaded|429/.test(text))
    return mapped("rate_limited");
  return mapped("unknown");
}

function mapped(code: ProviderErrorCode): MappedProviderError {
  return { code, message: MESSAGES[code] };
}

function statusOf(err: unknown): number | undefined {
  if (err && typeof err === "object") {
    const e = err as { statusCode?: unknown; status?: unknown };
    const s = typeof e.statusCode === "number" ? e.statusCode : e.status;
    if (typeof s === "number") return s;
  }
  return undefined;
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "";
}
