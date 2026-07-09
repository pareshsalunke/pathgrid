import { NextResponse, after } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { env } from "@/lib/env";
import { resolveProviderConfig } from "@/lib/ai/registry";
import { mapProviderError } from "@/lib/ai/errors";
import { runTutorTurn, summarizeThread } from "@/lib/ai/tutor";
import {
  tutorSystemPrompt,
  buildPathOutline,
  type TutorOpenTopic,
} from "@/lib/ai/chat-prompts";
import { getRoadmapForChat, type RoadmapTopic } from "@/lib/db/roadmaps";
import { getUserProgress } from "@/lib/db/progress";
import {
  createThread,
  getThreadForOwner,
  listRecentMessages,
  insertUserMessage,
  insertAssistantMessage,
  updateUserMessageTokens,
  unsummarizedOlderCount,
  listUnsummarizedOlder,
  updateThreadSummary,
} from "@/lib/db/chat";
import { track } from "@/lib/track";
import type { RoadmapGraph } from "@/lib/schemas/graph";

/**
 * POST /api/ai/chat — roadmap-grounded tutor chat (docs/08 Phase 3 item 5;
 * docs/06 §3.7, docs/04 §4). Runs on the caller's BYOK key, streams SSE
 * (meta → delta… → done|error), persists the thread + both messages, and keeps
 * a rolling summary of turns older than the context window.
 *
 * Context is assembled 100% server-side (docs/05 §4) — the client only names a
 * thread/roadmap/node; outline, statuses, and topic bodies come from the DB.
 * The key is resolved per request and never persisted or logged.
 */

// Uniform with /api/ai/roadmap; single replies are far quicker but slow
// providers + summary persistence get generous headroom.
export const maxDuration = 300;

/** Context window (doc 05 §4: cap history ~20; summarize older turns). */
const HISTORY_WINDOW = 20;
/** Re-summarize only when ≥10 messages sit outside summary+window (hysteresis). */
const SUMMARY_HYSTERESIS = 10;

const bodySchema = z.object({
  threadId: z.uuid().optional(),
  roadmapId: z.uuid().optional(),
  message: z.string().trim().min(1).max(4000), // input hygiene, docs/06 §5
  openTopicNodeId: z.string().max(200).optional(),
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

  // Resolve thread + grounding roadmap BEFORE streaming so failures stay plain
  // JSON (once SSE starts the HTTP status is committed). The thread is created
  // up front so the meta event's threadId is already durable.
  let threadId: string;
  let title: string;
  let summary: string | null = null;
  let summaryUpto: number | null = null;
  let roadmap: Awaited<ReturnType<typeof getRoadmapForChat>> = null;

  if (input.threadId) {
    const thread = await getThreadForOwner(input.threadId, userId);
    if (!thread)
      return NextResponse.json({ error: "thread_not_found" }, { status: 404 });
    threadId = thread.id;
    title = thread.title ?? deriveTitle(input.message);
    summary = thread.summary;
    summaryUpto = thread.summaryUpto;
    // The thread's own grounding wins; body roadmapId is ignored here. A map
    // that has since become inaccessible (deleted → SET NULL already cleared
    // it; privatized → this returns null) degrades to the general tutor.
    if (thread.roadmapId)
      roadmap = await getRoadmapForChat(thread.roadmapId, userId);
  } else {
    if (input.roadmapId) {
      roadmap = await getRoadmapForChat(input.roadmapId, userId);
      if (!roadmap)
        return NextResponse.json(
          { error: "roadmap_not_found" },
          { status: 404 },
        );
    }
    title = deriveTitle(input.message);
    ({ id: threadId } = await createThread({
      userId,
      roadmapId: roadmap?.id ?? null,
      title,
    }));
  }

  // Rolling-summary maintenance, scheduled off the hot path — after() runs once
  // the SSE stream closes. Pre-turn count is fine: the ±2 messages this turn
  // adds are inside the hysteresis. The closure briefly holds the caller's key
  // past response close — same invocation, still memory-only (DECISIONS.md).
  if (input.threadId) {
    const older = await unsummarizedOlderCount(
      threadId,
      summaryUpto,
      HISTORY_WINDOW,
    );
    if (older >= SUMMARY_HYSTERESIS) {
      const tid = threadId;
      const prior = summary;
      const upto = summaryUpto;
      after(async () => {
        const startedAt = Date.now();
        const logSummary = (
          ok: boolean,
          usage?: { inputTokens: number; outputTokens: number },
          code?: string,
        ) =>
          track(
            "ai_call",
            {
              feature: "chat_summary",
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
          const batch = await listUnsummarizedOlder(tid, upto, HISTORY_WINDOW);
          if (!batch) return;
          const result = await summarizeThread({
            config,
            priorSummary: prior,
            messages: batch.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          });
          await updateThreadSummary(tid, result.summary, batch.upto);
          await logSummary(true, result.usage);
        } catch (err) {
          // Best-effort: a failed summary never breaks chat; next trigger retries.
          await logSummary(false, undefined, mapProviderError(err).code);
        }
      });
    }
  }

  const encoder = new TextEncoder();
  const startedAt = Date.now();
  // The client may disconnect mid-answer (tab close). Keep generating and
  // persisting — the answer lands in the thread; only sending stops.
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      const logCall = (
        ok: boolean,
        usage?: { inputTokens: number; outputTokens: number },
        code?: string,
      ) =>
        track(
          "ai_call",
          {
            feature: "chat",
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

      // First event doubles as the "connection live" signal; for new threads
      // the client swaps its URL to /ai/chat/{threadId} off this.
      send({ type: "meta", threadId, title });

      try {
        // Window BEFORE inserting this turn's row: last ≤20 + the new message.
        const history = await listRecentMessages(threadId, HISTORY_WINDOW);
        const { id: userMessageId } = await insertUserMessage(
          threadId,
          input.message,
        );

        let roadmapBlock: { title: string; outline: string } | null = null;
        if (roadmap) {
          const statuses = await getUserProgress(userId, roadmap.id);
          roadmapBlock = {
            title: roadmap.title,
            outline: buildPathOutline(roadmap.graph, statuses),
          };
        }
        const system = tutorSystemPrompt({
          roadmap: roadmapBlock,
          openTopic: resolveOpenTopic(roadmap, input.openTopicNodeId),
          summary,
        });

        const result = await runTutorTurn({
          config,
          system,
          history: history.map((m) => ({ role: m.role, content: m.content })),
          message: input.message,
          onDelta: (text) => send({ type: "delta", text }),
        });

        // Per-turn cost split (DECISIONS): input on the user row, output on the
        // assistant row — thread SUM = what the user paid.
        await Promise.all([
          updateUserMessageTokens(userMessageId, result.usage.inputTokens),
          insertAssistantMessage(
            threadId,
            result.text,
            result.usage.outputTokens,
          ),
        ]);
        await logCall(true, result.usage);
        send({ type: "done", usage: result.usage });
      } catch (err) {
        // Provider failure mid-turn: the user row stays (retry continues the
        // thread), no assistant row. Map to an actionable code; never raw output.
        const mapped = mapProviderError(err);
        await logCall(false, undefined, mapped.code);
        send({ type: "error", code: mapped.code, message: mapped.message });
      } finally {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            /* already closed by the client */
          }
        }
      }
    },
    cancel() {
      closed = true;
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

/** Thread title = first message, whitespace-collapsed, ~60 chars (DECISIONS:
 *  no silent AI call on the user's key just for a title). */
function deriveTitle(message: string): string {
  const collapsed = message.replace(/\s+/g, " ").trim();
  return collapsed.length <= 60
    ? collapsed
    : `${collapsed.slice(0, 60).trimEnd()}…`;
}

/** The drawer's open topic: body from the topics row when one exists (official
 *  maps); label-only for generated maps — the tutor explains from its own
 *  knowledge (the item-5 unlock). Unknown/stale node ids are silently omitted. */
function resolveOpenTopic(
  roadmap: { graph: RoadmapGraph; topics: RoadmapTopic[] } | null,
  nodeId: string | undefined,
): TutorOpenTopic | null {
  if (!roadmap || !nodeId) return null;
  const node = roadmap.graph.nodes.find(
    (n) => n.id === nodeId && (n.type === "topic" || n.type === "subtopic"),
  );
  if (!node) return null;
  const row = roadmap.topics.find((t) => t.nodeId === nodeId);
  return { title: row?.title ?? node.data.label, bodyMd: row?.bodyMd ?? null };
}
