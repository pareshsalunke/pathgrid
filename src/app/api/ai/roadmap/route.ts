import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { env } from "@/lib/env";
import { resolveProviderConfig } from "@/lib/ai/registry";
import { mapProviderError } from "@/lib/ai/errors";
import {
  generateRoadmap,
  GenerationInvalidError,
  StructuredOutputError,
} from "@/lib/ai/generate-roadmap";
import { createGeneratedRoadmap } from "@/lib/db/generated";
import {
  acquireGenerationLock,
  releaseGenerationLock,
} from "@/lib/db/generation-lock";
import { track } from "@/lib/track";

/**
 * POST /api/ai/roadmap — personalized roadmap generation (docs/08 Phase 3 item 3;
 * docs/06 §3.6). Runs on the caller's BYOK key (headers per docs/04 §4 + DECISIONS),
 * streams SSE progress events, saves the result as a private roadmap + a
 * generated_items row, and finishes with usage figures for the cost display.
 *
 * Security: the key is resolved per request and never persisted or logged;
 * track("ai_call") records provider/model/tokens only.
 */

// Generation is minutes-scale on slow providers; stream keeps the connection live.
export const maxDuration = 300;

const bodySchema = z.object({
  goal: z.string().trim().min(4).max(500), // input hygiene, docs/06 §5
  level: z.enum(["beginner", "intermediate", "advanced"]),
  known: z.string().trim().max(500).optional(),
  hoursPerWeek: z.number().int().min(1).max(80),
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
  const input = parsed.data;

  // One in-flight generation per user (docs/05 §4) — protects the caller's wallet from
  // a double-submit / second tab. Released in the stream's finally; stale-reclaimable.
  if (!(await acquireGenerationLock(userId)))
    return NextResponse.json(
      { error: "generation_in_progress" },
      { status: 409 },
    );

  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );

      const logCall = (
        ok: boolean,
        usage?: { inputTokens: number; outputTokens: number },
        code?: string,
      ) =>
        track(
          "ai_call",
          {
            feature: "roadmap",
            provider: config.provider,
            model: config.models.smart,
            inTokens: usage?.inputTokens ?? 0,
            outTokens: usage?.outputTokens ?? 0,
            latencyMs: Date.now() - startedAt,
            ok,
            ...(code ? { code } : {}),
          },
          userId,
        );

      try {
        const result = await generateRoadmap({
          config,
          input,
          onProgress: (step) => send({ type: "progress", step }),
        });

        send({ type: "progress", step: "save" });
        const { roadmapId } = await createGeneratedRoadmap({
          userId,
          title: result.title,
          brief: input.goal,
          graph: result.graph,
        });

        await logCall(true, result.usage);
        // Graph rides on the done event so the hub previews with no extra fetch.
        send({
          type: "done",
          roadmapId,
          title: result.title,
          usage: result.usage,
          graph: result.graph,
        });
      } catch (err) {
        // Map to an actionable code; never expose raw provider/model output.
        if (
          err instanceof GenerationInvalidError ||
          err instanceof StructuredOutputError
        ) {
          await logCall(false, err.usage, "generation_invalid");
          send({
            type: "error",
            code: "generation_invalid",
            message:
              "The model returned an invalid roadmap after a repair attempt. Try again or pick a different smart model in Settings.",
          });
        } else {
          const mapped = mapProviderError(err);
          await logCall(false, undefined, mapped.code);
          send({ type: "error", code: mapped.code, message: mapped.message });
        }
      } finally {
        await releaseGenerationLock(userId).catch(() => {});
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
