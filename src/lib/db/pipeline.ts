import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { getDb } from "./index";
import { roadmaps, roadmapVersions, topics, resources } from "./schema";
import { upsertQuiz } from "./quiz";
import { validateGraph, type RoadmapGraph } from "@/lib/schemas/graph";
import type { Seo, TopicMeta, ResourceKind } from "@/lib/schemas/content";
import type { QuizQuestion } from "@/lib/schemas/quiz";

/**
 * Seeding-pipeline repository (docs/06 §2 steps 8b/9; docs/08 Phase 4).
 *
 * Draft mechanism = `visibility:'unlisted'` (DECISIONS.md): drafts render on the real
 * `/[roadmapSlug]` page for review while staying off home + sitemap (both filter
 * `public`); `publishRoadmap` flips the switch. Re-seeding an existing slug appends a
 * new version (the doc 06 §4.4 freshness path) and does NOT touch visibility, so a
 * published roadmap never silently unpublishes. Sequential awaits — neon-http has no
 * multi-statement transactions (seed.ts precedent).
 */

export type DraftResource = {
  kind: ResourceKind;
  title: string;
  url: string;
  isPaid?: boolean;
};

export type DraftTopic = {
  nodeId: string;
  slug: string;
  title: string;
  bodyMd: string;
  meta: TopicMeta;
  resources: DraftResource[];
};

export type DraftQuiz = {
  nodeId: string;
  questions: QuizQuestion[];
  model: string;
};

export async function upsertDraftRoadmap({
  slug,
  title,
  brief,
  category,
  seo,
  graph,
  topics: draftTopics,
  quizzes,
}: {
  slug: string;
  title: string;
  brief: string;
  category: "role" | "skill";
  seo: Seo;
  graph: RoadmapGraph;
  topics: DraftTopic[];
  quizzes: DraftQuiz[];
}): Promise<{ roadmapId: string; version: number }> {
  const parsed = validateGraph(graph);
  if (!parsed.success) {
    throw new Error(
      `Graph invalid for '${slug}':\n` +
        parsed.error.issues.map((i) => `  - ${i.message}`).join("\n"),
    );
  }
  const db = getDb();

  // Roadmap row: create as an unlisted draft, or refresh in place (new version).
  const [existing] = await db
    .select({ id: roadmaps.id })
    .from(roadmaps)
    .where(eq(roadmaps.slug, slug))
    .limit(1);

  let roadmapId: string;
  let version: number;
  if (existing) {
    roadmapId = existing.id;
    const [{ maxVersion }] = await db
      .select({
        maxVersion:
          sql<number>`coalesce(max(${roadmapVersions.version}), 0)`.mapWith(
            Number,
          ),
      })
      .from(roadmapVersions)
      .where(eq(roadmapVersions.roadmapId, roadmapId));
    version = maxVersion + 1;
    await db
      .update(roadmaps)
      .set({ title, brief, category, seo, updatedAt: sql`now()` })
      .where(eq(roadmaps.id, roadmapId));
  } else {
    version = 1;
    const [rm] = await db
      .insert(roadmaps)
      .values({
        slug,
        title,
        brief,
        category,
        seo,
        isAiGenerated: true, // AI-drafted, human-reviewed (doc 06 §4.5)
        visibility: "unlisted", // draft until publishRoadmap
      })
      .returning({ id: roadmaps.id });
    roadmapId = rm.id;
  }

  const [ver] = await db
    .insert(roadmapVersions)
    .values({ roadmapId, graph: parsed.data, version })
    .returning({ id: roadmapVersions.id });
  await db
    .update(roadmaps)
    .set({ currentVersionId: ver.id })
    .where(eq(roadmaps.id, roadmapId));

  // Topics are replaced wholesale (resources cascade with them); quizzes are keyed
  // by (roadmapId, nodeId) with no topics FK, so they upsert independently.
  await db.delete(topics).where(eq(topics.roadmapId, roadmapId));
  if (draftTopics.length) {
    const topicRows = await db
      .insert(topics)
      .values(
        draftTopics.map((t) => ({
          roadmapId,
          nodeId: t.nodeId,
          slug: t.slug,
          title: t.title,
          bodyMd: t.bodyMd,
          meta: t.meta,
        })),
      )
      .returning({ id: topics.id, nodeId: topics.nodeId });
    const topicIdByNode = new Map(topicRows.map((r) => [r.nodeId, r.id]));

    const resourceRows = draftTopics.flatMap((t) =>
      t.resources.map((r, i) => ({
        topicId: topicIdByNode.get(t.nodeId)!,
        kind: r.kind,
        title: r.title,
        url: r.url,
        isPaid: r.isPaid ?? false,
        position: i,
        status: "verified" as const, // only HEAD-checked links reach this repo
      })),
    );
    if (resourceRows.length) await db.insert(resources).values(resourceRows);
  }

  for (const q of quizzes) {
    await upsertQuiz({
      roadmapId,
      nodeId: q.nodeId,
      questions: q.questions,
      model: q.model,
    });
  }

  return { roadmapId, version };
}

/** Step 9: flip an unlisted draft live. Returns null when the slug doesn't exist. */
export async function publishRoadmap(
  slug: string,
): Promise<{ roadmapId: string } | null> {
  const db = getDb();
  const [row] = await db
    .update(roadmaps)
    .set({ visibility: "public", updatedAt: sql`now()` })
    .where(eq(roadmaps.slug, slug))
    .returning({ id: roadmaps.id });
  return row ? { roadmapId: row.id } : null;
}

export type DraftListing = {
  slug: string;
  title: string;
  category: "role" | "skill" | "custom";
  updatedAt: Date;
};

/** Official (ownerless) unlisted drafts awaiting review — the /admin/pipeline list. */
export async function listDraftRoadmaps(): Promise<DraftListing[]> {
  const db = getDb();
  const rows = await db
    .select({
      slug: roadmaps.slug,
      title: roadmaps.title,
      category: roadmaps.category,
      updatedAt: roadmaps.updatedAt,
    })
    .from(roadmaps)
    .where(and(eq(roadmaps.visibility, "unlisted"), isNull(roadmaps.ownerId)))
    .orderBy(desc(roadmaps.updatedAt));
  return rows.filter((r): r is DraftListing & { slug: string } =>
    Boolean(r.slug),
  );
}
