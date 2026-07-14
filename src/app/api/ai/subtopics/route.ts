import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { env } from "@/lib/env";
import { resolveProviderConfig } from "@/lib/ai/registry";
import { mapProviderError } from "@/lib/ai/errors";
import { generateSubtopics, StructuredOutputError } from "@/lib/ai/subtopics";
import { track } from "@/lib/track";

/**
 * POST /api/ai/subtopics — AI-assist for the roadmap editor (docs/03 §3.5, docs/06
 * §3.6). Given the roadmap title + the selected node's label (+ its existing children,
 * so the model doesn't repeat them), returns ~5 subtopic titles on the caller's BYOK
 * key (fast tier). The editor inserts them via graph-ops; autosave persists them.
 *
 * Deliberately does NO DB access (unlike POST /api/ai/quiz): the editor already holds
 * the live graph — including edits not yet autosaved — so a DB read would 404 on a
 * just-added node or feed stale context. Nothing is read or written; this mirrors POST
 * /api/ai/roadmap, which likewise generates from input strings with no access check.
 *
 * Security: key resolved per request, never persisted or logged; track("ai_call")
 * records provider/model/tokens only.
 */

// Fast-tier + tiny output — a minute is ample even on slow providers.
export const maxDuration = 60;

const bodySchema = z.object({
  roadmapTitle: z.string().trim().min(1).max(200),
  parentLabel: z.string().trim().min(1).max(200),
  // Existing child labels for de-duplication — best-effort context, bounded so a huge
  // graph can't bloat the prompt.
  existingChildren: z
    .array(z.string().trim().min(1).max(200))
    .max(40)
    .optional(),
});

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

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const { roadmapTitle, parentLabel, existingChildren = [] } = parsed.data;

  const startedAt = Date.now();
  const logCall = (
    ok: boolean,
    usage?: { inputTokens: number; outputTokens: number },
    code?: string,
  ) =>
    track(
      "ai_call",
      {
        feature: "assist",
        provider: config.provider,
        model: config.models.fast,
        inTokens: usage?.inputTokens ?? 0,
        outTokens: usage?.outputTokens ?? 0,
        latencyMs: Date.now() - startedAt,
        ok,
        ...(code ? { code } : {}),
      },
      userId,
    );

  try {
    const { subtopics, usage } = await generateSubtopics({
      config,
      roadmapTitle,
      parentLabel,
      existingChildren,
    });
    await logCall(true, usage);
    return NextResponse.json({
      subtopics,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      },
    });
  } catch (err) {
    // Map to an actionable code; never expose raw provider/model output.
    if (err instanceof StructuredOutputError) {
      await logCall(false, err.usage, "generation_invalid");
      return NextResponse.json(
        {
          error: "generation_invalid",
          message:
            "The model returned invalid suggestions after a repair attempt. Try again or pick a different fast model in Settings.",
        },
        { status: 422 },
      );
    }
    const mapped = mapProviderError(err);
    await logCall(false, undefined, mapped.code);
    return NextResponse.json(
      { error: mapped.code, message: mapped.message },
      { status: 502 },
    );
  }
}
