import { eq } from "drizzle-orm";
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
