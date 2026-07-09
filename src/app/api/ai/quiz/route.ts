import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { env } from "@/lib/env";
import { resolveProviderConfig } from "@/lib/ai/registry";
import { mapProviderError } from "@/lib/ai/errors";
import { generateQuiz, StructuredOutputError } from "@/lib/ai/quiz";
import { getRoadmapForChat } from "@/lib/db/roadmaps";
import { getQuiz, upsertQuiz } from "@/lib/db/quiz";
import { toPublicQuestions } from "@/lib/schemas/quiz";
import { track } from "@/lib/track";

/**
 * POST /api/ai/quiz — generate or fetch the cached quiz for a topic (docs/08 Phase 3
 * item 6; docs/06 §3.5, docs/04 §4). Runs on the caller's BYOK key (fast tier), caches
 * by (roadmapId, nodeId), and returns answer-stripped questions — `answerIdx`/`why` are
 * revealed only when POST /api/quiz-attempts grades a submission.
 *
 * Security: key resolved per request, never persisted or logged; track("ai_call")
 * records provider/model/tokens only, and only on a cache miss (a hit makes no call).
 */

// Fast-tier + small output — a minute is ample even on slow providers.
export const maxDuration = 60;

const bodySchema = z.object({
  roadmapId: z.uuid(),
  nodeId: z.string().trim().min(1).max(200),
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
  const { roadmapId, nodeId } = parsed.data;

  // Access check reuses the tutor rule: own it, or it's public/unlisted (docs/06 §3.7).
  const roadmap = await getRoadmapForChat(roadmapId, userId);
  if (!roadmap)
    return NextResponse.json({ error: "roadmap_not_found" }, { status: 404 });

  const node = roadmap.graph.nodes.find(
    (n) => n.id === nodeId && (n.type === "topic" || n.type === "subtopic"),
  );
  if (!node)
    return NextResponse.json({ error: "topic_not_found" }, { status: 404 });

  // Cache hit → no model call, no usage, no event.
  const cached = await getQuiz(roadmapId, nodeId);
  if (cached)
    return NextResponse.json({
      quizId: cached.id,
      questions: toPublicQuestions(cached.questions),
      cached: true,
    });

  // Context = the topic body when the map has one (official); label-only otherwise
  // (generated maps have no topics rows — the item-5 unlock).
  const topic = roadmap.topics.find((t) => t.nodeId === nodeId);
  const title = topic?.title ?? node.data.label;
  const context = topic?.bodyMd ?? null;

  const startedAt = Date.now();
  const logCall = (
    ok: boolean,
    usage?: { inputTokens: number; outputTokens: number },
    code?: string,
  ) =>
    track(
      "ai_call",
      {
        feature: "quiz",
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
    const { questions, usage } = await generateQuiz({ config, title, context });
    const { id: quizId } = await upsertQuiz({
      roadmapId,
      nodeId,
      questions,
      model: config.models.fast,
    });
    await logCall(true, usage);
    return NextResponse.json({
      quizId,
      questions: toPublicQuestions(questions),
      cached: false,
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
            "The model returned an invalid quiz after a repair attempt. Try again or pick a different fast model in Settings.",
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
