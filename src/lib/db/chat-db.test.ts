import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import type { RoadmapGraph } from "@/lib/schemas/graph";

// Load DATABASE_URL from .env so `pnpm test` can round-trip against Neon.
// If it's unavailable (e.g. CI without secrets), the suite skips.
if (!process.env.DATABASE_URL) {
  try {
    const line = readFileSync(".env", "utf8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="));
    if (line)
      process.env.DATABASE_URL = line.slice("DATABASE_URL=".length).trim();
  } catch {
    /* no .env — skip */
  }
}

const suite = process.env.DATABASE_URL ? describe : describe.skip;

const graph: RoadmapGraph = {
  $schema: "pathgrid/roadmap-graph/v1",
  meta: { title: "IT Chat Graph", level: "beginner", estHours: 2 },
  nodes: [
    {
      id: "title",
      type: "title",
      position: { x: 0, y: 0 },
      data: { label: "IT Chat Graph" },
    },
    {
      id: "a",
      type: "topic",
      position: { x: 0, y: 120 },
      data: { label: "A", slug: "a", order: 1 },
    },
  ],
  edges: [
    {
      id: "e1",
      source: "title",
      target: "a",
      data: { style: "solid", kind: "sequence" },
    },
  ],
};

suite("chat threads/messages persistence (Neon)", () => {
  let getDb: typeof import("./index").getDb;
  let schema: typeof import("./schema");
  let chat: typeof import("./chat");
  let userId: string;
  let strangerId: string;
  let roadmapId: string;
  let threadId: string;

  beforeAll(async () => {
    ({ getDb } = await import("./index"));
    schema = await import("./schema");
    chat = await import("./chat");

    const [u] = await getDb()
      .insert(schema.users)
      .values({
        email: `it-chat-${Math.floor(Math.random() * 1e9)}@example.com`,
        name: "IT Chat User",
      })
      .returning({ id: schema.users.id });
    userId = u.id;

    const [s] = await getDb()
      .insert(schema.users)
      .values({
        email: `it-chat-s-${Math.floor(Math.random() * 1e9)}@example.com`,
        name: "IT Chat Stranger",
      })
      .returning({ id: schema.users.id });
    strangerId = s.id;

    const { createGeneratedRoadmap } = await import("./generated");
    ({ roadmapId } = await createGeneratedRoadmap({
      userId,
      title: "IT Chat Graph",
      brief: "chat integration test",
      graph,
    }));
  });

  afterAll(async () => {
    // Deleting the users cascades roadmaps, generated_items, chat_threads
    // (and chat_messages via the thread FK).
    if (userId)
      await getDb().delete(schema.users).where(eq(schema.users.id, userId));
    if (strangerId)
      await getDb().delete(schema.users).where(eq(schema.users.id, strangerId));
  });

  it("creates a thread and reads it back owner-scoped", async () => {
    ({ id: threadId } = await chat.createThread({
      userId,
      roadmapId,
      title: "How do I start?",
    }));

    const thread = await chat.getThreadForOwner(threadId, userId);
    expect(thread).toMatchObject({
      id: threadId,
      roadmapId,
      roadmapTitle: "IT Chat Graph",
      roadmapSlug: null, // generated maps have no slug
      title: "How do I start?",
      summary: null,
      summaryUpto: null,
    });

    expect(await chat.getThreadForOwner(threadId, strangerId)).toBeNull();
    expect(
      await chat.getThreadForOwner(
        "00000000-0000-0000-0000-000000000000",
        userId,
      ),
    ).toBeNull();
  });

  it("appends messages, splits tokens across roles, sums per thread", async () => {
    const userMsg = await chat.insertUserMessage(threadId, "How do I start?");
    await chat.updateUserMessageTokens(userMsg.id, 120);
    await chat.insertAssistantMessage(threadId, "Start with node A.", 45);

    const messages = await chat.listRecentMessages(threadId, 20);
    expect(messages.map((m) => [m.role, m.tokens])).toEqual([
      ["user", 120],
      ["assistant", 45],
    ]);
    expect(new Date(messages[0].createdAt).getTime()).toBeGreaterThan(0);

    expect(await chat.threadTokenSum(threadId)).toBe(165);
  });

  it("windows history and reports the summarizer batch", async () => {
    // 2 messages exist; with a window of 1, one older message is unsummarized.
    expect(await chat.unsummarizedOlderCount(threadId, null, 1)).toBe(1);
    expect(await chat.unsummarizedOlderCount(threadId, null, 20)).toBe(0);
    expect(await chat.listUnsummarizedOlder(threadId, null, 20)).toBeNull();

    const batch = await chat.listUnsummarizedOlder(threadId, null, 1);
    expect(batch?.messages.map((m) => m.role)).toEqual(["user"]);

    await chat.updateThreadSummary(
      threadId,
      "User asked how to start.",
      batch!.upto,
    );
    const thread = await chat.getThreadForOwner(threadId, userId);
    expect(thread?.summary).toBe("User asked how to start.");
    expect(thread?.summaryUpto).toBe(batch!.upto);

    // Nothing older than the summary point remains outside a window of 1.
    expect(await chat.unsummarizedOlderCount(threadId, batch!.upto, 1)).toBe(0);
  });

  it("lists the rail cards with last activity", async () => {
    const cards = await chat.listThreads(userId);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: threadId,
      title: "How do I start?",
      roadmapId,
      roadmapTitle: "IT Chat Graph",
    });
    expect(new Date(cards[0].lastActivity).getTime()).toBeGreaterThan(0);
    expect(await chat.listThreads(strangerId)).toEqual([]);
  });

  it("getRoadmapForChat: owner or public/unlisted, never foreign-private", async () => {
    const { getRoadmapForChat } = await import("./roadmaps");
    const own = await getRoadmapForChat(roadmapId, userId);
    expect(own?.title).toBe("IT Chat Graph");
    expect(own?.slug).toBeNull();
    expect(own?.graph.nodes).toHaveLength(2);

    // Private + not the owner → inaccessible.
    expect(await getRoadmapForChat(roadmapId, strangerId)).toBeNull();

    // Public official roadmaps (seeded) are chat-able by anyone.
    const { getRoadmapBySlug } = await import("./roadmaps");
    const official = await getRoadmapBySlug("typescript");
    if (official) {
      const asStranger = await getRoadmapForChat(official.id, strangerId);
      expect(asStranger?.title).toBe(official.title);
      expect(asStranger?.slug).toBe("typescript");
    }
  });

  it("deleting the grounding roadmap degrades the thread to general tutor", async () => {
    ({ roadmapId } = await (
      await import("./generated")
    ).createGeneratedRoadmap({
      userId,
      title: "Doomed Map",
      brief: "will be deleted",
      graph,
    }));
    const { id: doomedThread } = await chat.createThread({
      userId,
      roadmapId,
      title: "About the doomed map",
    });

    await getDb()
      .delete(schema.roadmaps)
      .where(eq(schema.roadmaps.id, roadmapId));

    const thread = await chat.getThreadForOwner(doomedThread, userId);
    expect(thread).not.toBeNull();
    expect(thread?.roadmapId).toBeNull(); // SET NULL, not a blocked delete
  });

  it("deleting the user cascades threads and messages", async () => {
    const [u] = await getDb()
      .insert(schema.users)
      .values({
        email: `it-chat-del-${Math.floor(Math.random() * 1e9)}@example.com`,
      })
      .returning({ id: schema.users.id });
    const { id: tid } = await chat.createThread({
      userId: u.id,
      roadmapId: null,
      title: "general",
    });
    await chat.insertUserMessage(tid, "hello");

    await getDb().delete(schema.users).where(eq(schema.users.id, u.id));

    const rows = await getDb()
      .select()
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.threadId, tid));
    expect(rows).toEqual([]);
  });
});
