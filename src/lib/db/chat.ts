import { and, desc, eq, gt, count, sql } from "drizzle-orm";
import { getDb } from "./index";
import { chatThreads, chatMessages, roadmaps } from "./schema";

/**
 * Repository for tutor chat threads + messages (doc 04 §2). Sequential awaits —
 * neon-http has no multi-statement transactions.
 */

export type ChatRole = "user" | "assistant";

export type ChatThread = {
  id: string;
  userId: string;
  roadmapId: string | null;
  roadmapSlug: string | null;
  roadmapTitle: string | null;
  title: string | null;
  summary: string | null;
  summaryUpto: number | null;
};

export type ChatThreadCard = {
  id: string;
  title: string | null;
  roadmapId: string | null;
  roadmapSlug: string | null;
  roadmapTitle: string | null;
  lastActivity: string; // ISO — last message time, falling back to thread creation
};

export type ChatMessage = {
  id: number;
  role: ChatRole;
  content: string;
  tokens: number | null;
  createdAt: string; // ISO
};

export async function createThread({
  userId,
  roadmapId,
  title,
}: {
  userId: string;
  roadmapId: string | null;
  title: string;
}): Promise<{ id: string }> {
  const db = getDb();
  const [row] = await db
    .insert(chatThreads)
    .values({ userId, roadmapId, title })
    .returning({ id: chatThreads.id });
  return { id: row.id };
}

/** Owner-checked thread read (null on missing or foreign), with the grounding
 *  roadmap's title/slug joined in for the context chip. */
export async function getThreadForOwner(
  threadId: string,
  userId: string,
): Promise<ChatThread | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: chatThreads.id,
      userId: chatThreads.userId,
      roadmapId: chatThreads.roadmapId,
      roadmapSlug: roadmaps.slug,
      roadmapTitle: roadmaps.title,
      title: chatThreads.title,
      summary: chatThreads.summary,
      summaryUpto: chatThreads.summaryUpto,
    })
    .from(chatThreads)
    .leftJoin(roadmaps, eq(roadmaps.id, chatThreads.roadmapId))
    .where(eq(chatThreads.id, threadId))
    .limit(1);
  if (!row || row.userId !== userId) return null;
  return row;
}

/** The user's threads for the rail, newest activity first. */
export async function listThreads(
  userId: string,
  limit = 50,
): Promise<ChatThreadCard[]> {
  const db = getDb();
  const lastMsg = db
    .select({
      threadId: chatMessages.threadId,
      lastAt: sql<string>`max(${chatMessages.createdAt})`.as("last_at"),
    })
    .from(chatMessages)
    .groupBy(chatMessages.threadId)
    .as("last_msg");

  const rows = await db
    .select({
      id: chatThreads.id,
      title: chatThreads.title,
      roadmapId: chatThreads.roadmapId,
      roadmapSlug: roadmaps.slug,
      roadmapTitle: roadmaps.title,
      createdAt: chatThreads.createdAt,
      lastAt: lastMsg.lastAt,
    })
    .from(chatThreads)
    .leftJoin(roadmaps, eq(roadmaps.id, chatThreads.roadmapId))
    .leftJoin(lastMsg, eq(lastMsg.threadId, chatThreads.id))
    .where(eq(chatThreads.userId, userId))
    .orderBy(desc(sql`coalesce(${lastMsg.lastAt}, ${chatThreads.createdAt})`))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    roadmapId: r.roadmapId,
    roadmapSlug: r.roadmapSlug,
    roadmapTitle: r.roadmapTitle,
    lastActivity: toIso(r.lastAt ?? r.createdAt),
  }));
}

/** Last `limit` messages, oldest→newest (bigserial id is the thread order). */
export async function listRecentMessages(
  threadId: string,
  limit: number,
): Promise<ChatMessage[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(desc(chatMessages.id))
    .limit(limit);
  return rows.reverse().map((r) => ({
    id: r.id,
    role: r.role,
    content: r.content,
    tokens: r.tokens,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function insertUserMessage(
  threadId: string,
  content: string,
): Promise<{ id: number }> {
  const db = getDb();
  const [row] = await db
    .insert(chatMessages)
    .values({ threadId, role: "user", content })
    .returning({ id: chatMessages.id });
  return { id: row.id };
}

export async function insertAssistantMessage(
  threadId: string,
  content: string,
  tokens: number,
): Promise<{ id: number }> {
  const db = getDb();
  const [row] = await db
    .insert(chatMessages)
    .values({ threadId, role: "assistant", content, tokens })
    .returning({ id: chatMessages.id });
  return { id: row.id };
}

export async function updateUserMessageTokens(
  messageId: number,
  tokens: number,
): Promise<void> {
  const db = getDb();
  await db
    .update(chatMessages)
    .set({ tokens })
    .where(eq(chatMessages.id, messageId));
}

/**
 * How many messages are neither folded into the thread summary nor inside the
 * live context window — the summarize-trigger count (cheap, runs every turn).
 */
export async function unsummarizedOlderCount(
  threadId: string,
  summaryUpto: number | null,
  windowSize: number,
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ n: count() })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.threadId, threadId),
        gt(chatMessages.id, summaryUpto ?? 0),
      ),
    );
  return Math.max(0, row.n - windowSize);
}

/**
 * The unsummarized messages that have scrolled out of the context window,
 * oldest→newest, plus the id the summary will cover through. Null when the
 * window still holds everything.
 */
export async function listUnsummarizedOlder(
  threadId: string,
  summaryUpto: number | null,
  windowSize: number,
): Promise<{ messages: ChatMessage[]; upto: number } | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.threadId, threadId),
        gt(chatMessages.id, summaryUpto ?? 0),
      ),
    )
    .orderBy(chatMessages.id);
  if (rows.length <= windowSize) return null;
  const older = rows.slice(0, rows.length - windowSize);
  return {
    messages: older.map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      tokens: r.tokens,
      createdAt: r.createdAt.toISOString(),
    })),
    upto: older[older.length - 1].id,
  };
}

export async function updateThreadSummary(
  threadId: string,
  summary: string,
  upto: number,
): Promise<void> {
  const db = getDb();
  await db
    .update(chatThreads)
    .set({ summary, summaryUpto: upto })
    .where(eq(chatThreads.id, threadId));
}

/** Total tokens paid across a thread (user rows = input, assistant = output). */
export async function threadTokenSum(threadId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${chatMessages.tokens}), 0)`.mapWith(
        Number,
      ),
    })
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId));
  return row.total;
}

function toIso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
