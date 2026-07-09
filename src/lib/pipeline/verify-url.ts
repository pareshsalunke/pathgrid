/**
 * Resource link verification (Policy A, docs/06 §2 step 5): a suggested URL is
 * publishable only if it answers. HEAD first (cheap), falling back to GET for hosts
 * that reject HEAD (405/403/501 — common on docs CDNs). Anything else — 4xx/5xx,
 * DNS failure, timeout — fails verification and the resource is dropped, never
 * published as `unverified` (doc 06: dead links destroy trust faster than no links).
 */

const TIMEOUT_MS = 8_000;
const HEADERS = { "user-agent": "pathgrid-pipeline/1.0 (content link check)" };
const RETRY_AS_GET = new Set([403, 405, 501]);

export async function verifyUrl(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const head = await fetchImpl(url, {
      method: "HEAD",
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (head.ok) return true;
    if (!RETRY_AS_GET.has(head.status)) return false;

    const get = await fetchImpl(url, {
      method: "GET",
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return get.ok;
  } catch {
    return false; // network error / timeout / invalid URL → not verifiable
  }
}
