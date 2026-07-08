import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "./index";
import { userTopicProgress, roadmaps, topics } from "./schema";
import type { ProgressStatus } from "@/lib/schemas/progress";

const RANK: Record<ProgressStatus, number> = {
  pending: 0,
  skipped: 1,
  learning: 2,
  done: 3,
};

/** Merge policy: higher rank wins, so "done" is never downgraded by a stale write. */
export function mergeStatuses(
  a: ProgressStatus | undefined,
  b: ProgressStatus | undefined,
): ProgressStatus {
  const av = a ?? "pending";
  const bv = b ?? "pending";
  return RANK[av] >= RANK[bv] ? av : bv;
}

export async function getUserProgress(
  userId: string,
  roadmapId: string,
): Promise<Record<string, ProgressStatus>> {
  const rows = await getDb()
    .select({
      nodeId: userTopicProgress.nodeId,
      status: userTopicProgress.status,
    })
    .from(userTopicProgress)
    .where(
      and(
        eq(userTopicProgress.userId, userId),
        eq(userTopicProgress.roadmapId, roadmapId),
      ),
    );
  return Object.fromEntries(rows.map((r) => [r.nodeId, r.status]));
}

/** Device-authoritative write: the client's value wins for the nodes it sent. */
export async function putUserProgress(
  userId: string,
  roadmapId: string,
  statuses: Record<string, ProgressStatus>,
): Promise<void> {
  const entries = Object.entries(statuses);
  if (entries.length === 0) return;
  await getDb()
    .insert(userTopicProgress)
    .values(
      entries.map(([nodeId, status]) => ({
        userId,
        roadmapId,
        nodeId,
        status,
      })),
    )
    .onConflictDoUpdate({
      target: [
        userTopicProgress.userId,
        userTopicProgress.roadmapId,
        userTopicProgress.nodeId,
      ],
      set: { status: sql`excluded.status`, updatedAt: sql`now()` },
    });
}

/** Fold anonymous progress into the account with the rank policy (done wins). */
export async function mergeUserProgress(
  userId: string,
  byRoadmap: Record<string, Record<string, ProgressStatus>>,
): Promise<void> {
  for (const [roadmapId, statuses] of Object.entries(byRoadmap)) {
    try {
      const existing = await getUserProgress(userId, roadmapId);
      const merged: Record<string, ProgressStatus> = {};
      for (const [nodeId, st] of Object.entries(statuses)) {
        const m = mergeStatuses(existing[nodeId], st);
        if (m !== existing[nodeId]) merged[nodeId] = m;
      }
      await putUserProgress(userId, roadmapId, merged);
    } catch (err) {
      // skip unknown roadmap ids (FK) — a client can send stale local keys
      console.error(`mergeUserProgress skipped ${roadmapId}`, err);
    }
  }
}

export type ProgressSummaryRow = {
  slug: string;
  title: string;
  category: "role" | "skill" | "custom";
  doneCount: number;
  topicCount: number;
  pct: number;
};

/** Per-roadmap progress for the dashboard "continue learning" section. */
export async function getUserProgressSummary(
  userId: string,
): Promise<ProgressSummaryRow[]> {
  const db = getDb();
  const prog = await db
    .select({
      roadmapId: userTopicProgress.roadmapId,
      slug: roadmaps.slug,
      title: roadmaps.title,
      category: roadmaps.category,
      status: userTopicProgress.status,
    })
    .from(userTopicProgress)
    .innerJoin(roadmaps, eq(roadmaps.id, userTopicProgress.roadmapId))
    .where(eq(userTopicProgress.userId, userId));

  if (prog.length === 0) return [];

  const roadmapIds = [...new Set(prog.map((p) => p.roadmapId))];
  const counts = await db
    .select({
      roadmapId: topics.roadmapId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(topics)
    .where(inArray(topics.roadmapId, roadmapIds))
    .groupBy(topics.roadmapId);
  const topicCount = new Map(counts.map((c) => [c.roadmapId, c.count]));

  const grouped = new Map<
    string,
    {
      slug: string | null;
      title: string;
      category: "role" | "skill" | "custom";
      done: number;
    }
  >();
  for (const p of prog) {
    let g = grouped.get(p.roadmapId);
    if (!g) {
      g = { slug: p.slug, title: p.title, category: p.category, done: 0 };
      grouped.set(p.roadmapId, g);
    }
    if (p.status === "done") g.done += 1;
  }

  return [...grouped.entries()]
    .filter(([, g]) => g.slug)
    .map(([id, g]) => {
      const tc = topicCount.get(id) ?? 0;
      return {
        slug: g.slug!,
        title: g.title,
        category: g.category,
        doneCount: g.done,
        topicCount: tc,
        pct: tc ? Math.round((g.done / tc) * 100) : 0,
      };
    })
    .sort((a, b) => b.pct - a.pct);
}
