import { NextResponse } from "next/server";
import { generateText } from "ai";
import { auth } from "@/auth";
import { env } from "@/lib/env";
import { getModel, resolveProviderConfig } from "@/lib/ai/registry";
import { mapProviderError } from "@/lib/ai/errors";
import { track } from "@/lib/track";

/**
 * POST /api/ai/test-key — validate a BYOK key (docs/05 §4).
 *
 * Session-gated (AI features require auth, doc 04 §4). Honors the AI_DISABLED kill
 * switch. Reads the provider config from the transport headers and makes a minimal
 * 1-token generation on the caller's fast model to prove the key is valid and the
 * provider is reachable. Provider errors are mapped to actionable codes.
 *
 * Security: the key is used in memory only and forwarded to the provider by the
 * registry — it is never persisted or logged, and only the provider name + outcome
 * (never the key or raw error body) are recorded via track().
 */
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (env.aiDisabled)
    return NextResponse.json({ error: "ai_disabled" }, { status: 503 });

  const config = resolveProviderConfig(req);
  if (!config)
    return NextResponse.json({ error: "no_provider_key" }, { status: 400 });

  try {
    await generateText({
      model: getModel(config, "fast"),
      prompt: "ping",
      maxOutputTokens: 1,
      abortSignal: AbortSignal.timeout(15_000),
    });
    await track("ai_test_key", { provider: config.provider, ok: true }, userId);
    return NextResponse.json({ ok: true, provider: config.provider });
  } catch (err) {
    const { code, message } = mapProviderError(err);
    await track(
      "ai_test_key",
      { provider: config.provider, ok: false, code },
      userId,
    );
    return NextResponse.json({ ok: false, code, message });
  }
}
