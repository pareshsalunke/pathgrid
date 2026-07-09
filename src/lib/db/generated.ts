import { desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { roadmaps, roadmapVersions, generatedItems } from "./schema";
import type { RoadmapGraph } from "@/lib/schemas/graph";

/**
 * Repository for AI-generated artifacts (doc 04 §2 generated_items). Saving a
 * generated roadmap follows the seed's insert sequence — roadmap → version →
 * currentVersionId update — because neon-http has no multi-statement transactions.
 */

export async function createGeneratedRoadmap({
  userId,
  title,
  brief,
  graph,
}: {
  userId: string;
  title: string;
  brief: string;
  graph: RoadmapGraph;
}): Promise<{ roadmapId: string }> {
  const db = getDb();

  const [rm] = await db
    .insert(roadmaps)
    .values({
      slug: null, // private user roadmaps have no public slug (doc 04 §2)
      title,
      brief,
      category: "custom",
      ownerId: userId,
      visibility: "private",
      isAiGenerated: true,
    })
    .returning({ id: roadmaps.id });

  const [ver] = await db
    .insert(roadmapVersions)
    .values({ roadmapId: rm.id, graph, version: 1 })
    .returning({ id: roadmapVersions.id });

  await db
    .update(roadmaps)
    .set({ currentVersionId: ver.id })
    .where(eq(roadmaps.id, rm.id));

  await db.insert(generatedItems).values({
    userId,
    kind: "roadmap",
    title,
    payloadRef: rm.id,
  });

  return { roadmapId: rm.id };
}

export type GeneratedRoadmapCard = {
  itemId: string;
  roadmapId: string;
  title: string;
  createdAt: string; // ISO
  stageCount: number;
  topicCount: number;
};

/**
 * The user's generated roadmaps for the hub rail / library (doc 04 §4
 * GET /api/me/library). Counts are computed server-side from the stored graph so
 * the client payload stays tiny (no graphs over the wire).
 */
export async function listGeneratedRoadmaps(
  userId: string,
): Promise<GeneratedRoadmapCard[]> {
  const db = getDb();
  const rows = await db
    .select({
      itemId: generatedItems.id,
      roadmapId: roadmaps.id,
      title: roadmaps.title,
      createdAt: generatedItems.createdAt,
      graph: roadmapVersions.graph,
    })
    .from(generatedItems)
    .innerJoin(roadmaps, eq(roadmaps.id, generatedItems.payloadRef))
    .innerJoin(
      roadmapVersions,
      eq(roadmapVersions.id, roadmaps.currentVersionId),
    )
    .where(eq(generatedItems.userId, userId))
    .orderBy(desc(generatedItems.createdAt));

  return rows.map((r) => ({
    itemId: r.itemId,
    roadmapId: r.roadmapId,
    title: r.title,
    createdAt: r.createdAt.toISOString(),
    stageCount: r.graph.nodes.filter((n) => n.type === "section").length,
    topicCount: r.graph.nodes.filter(
      (n) => n.type === "topic" || n.type === "subtopic",
    ).length,
  }));
}
