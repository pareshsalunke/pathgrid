import { eq, asc, sql, inArray } from "drizzle-orm";
import { getDb } from "./index";
import { roadmaps, roadmapVersions, topics, resources } from "./schema";
import type { RoadmapGraph } from "@/lib/schemas/graph";
import type { TopicMeta, Seo, ResourceKind } from "@/lib/schemas/content";

/** Repositories — the only place that queries the DB (CLAUDE.md: no queries in components). */

export type CatalogCard = {
  slug: string;
  title: string;
  brief: string | null;
  category: "role" | "skill" | "custom";
  topicCount: number;
};

export type Catalog = { role: CatalogCard[]; skill: CatalogCard[] };

export async function listCatalog(): Promise<Catalog> {
  const db = getDb();
  const rows = await db
    .select({
      slug: roadmaps.slug,
      title: roadmaps.title,
      brief: roadmaps.brief,
      category: roadmaps.category,
      topicCount: sql<number>`count(${topics.id})`.mapWith(Number),
    })
    .from(roadmaps)
    .leftJoin(topics, eq(topics.roadmapId, roadmaps.id))
    .where(eq(roadmaps.visibility, "public"))
    .groupBy(roadmaps.id)
    .orderBy(asc(roadmaps.title));

  const cards: CatalogCard[] = rows
    .filter((r): r is typeof r & { slug: string } => Boolean(r.slug))
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      brief: r.brief,
      category: r.category,
      topicCount: r.topicCount,
    }));

  return {
    role: cards.filter((c) => c.category === "role"),
    skill: cards.filter((c) => c.category === "skill"),
  };
}

export type RoadmapResource = {
  kind: ResourceKind;
  title: string;
  url: string;
  isPaid: boolean;
};

export type RoadmapTopic = {
  nodeId: string;
  slug: string;
  title: string;
  bodyMd: string | null;
  meta: TopicMeta | null;
  resources: RoadmapResource[];
};

export type RoadmapPage = {
  id: string;
  slug: string;
  title: string;
  brief: string | null;
  category: "role" | "skill" | "custom";
  /** Drives the "AI-drafted, human-reviewed" provenance line (doc 06 §4.5). */
  isAiGenerated: boolean;
  /** 'unlisted' = pipeline draft under review — page must emit noindex. */
  visibility: "public" | "unlisted" | "private";
  graph: RoadmapGraph;
  seo: Seo | null;
  topics: RoadmapTopic[];
};

export async function listRoadmapSlugs(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ slug: roadmaps.slug })
    .from(roadmaps)
    .where(eq(roadmaps.visibility, "public"));
  return rows.map((r) => r.slug).filter((s): s is string => Boolean(s));
}

export async function getRoadmapBySlug(
  slug: string,
): Promise<RoadmapPage | null> {
  const db = getDb();
  const [rm] = await db
    .select()
    .from(roadmaps)
    .where(eq(roadmaps.slug, slug))
    .limit(1);
  if (!rm || !rm.slug || !rm.currentVersionId) return null;

  const payload = await loadRoadmapPayload(rm.id, rm.currentVersionId);
  if (!payload) return null;

  return {
    id: rm.id,
    slug: rm.slug,
    title: rm.title,
    brief: rm.brief,
    category: rm.category,
    isAiGenerated: rm.isAiGenerated ?? false,
    visibility: rm.visibility,
    seo: rm.seo,
    ...payload,
  };
}

/**
 * Owner-checked read for private (slug-less) roadmaps — the /ai/roadmap/[id]
 * viewer (docs/03 §2). Returns null unless the roadmap belongs to `ownerId`.
 * Slug is intentionally absent from the shape: generated maps have none.
 */
export async function getRoadmapById(
  roadmapId: string,
  ownerId: string,
): Promise<Omit<RoadmapPage, "slug"> | null> {
  const db = getDb();
  const [rm] = await db
    .select()
    .from(roadmaps)
    .where(eq(roadmaps.id, roadmapId))
    .limit(1);
  if (!rm || rm.ownerId !== ownerId || !rm.currentVersionId) return null;

  const payload = await loadRoadmapPayload(rm.id, rm.currentVersionId);
  if (!payload) return null;

  return {
    id: rm.id,
    title: rm.title,
    brief: rm.brief,
    category: rm.category,
    isAiGenerated: rm.isAiGenerated ?? false,
    visibility: rm.visibility,
    seo: rm.seo,
    ...payload,
  };
}

/**
 * Access-checked read for grounding the tutor (docs 06 §3.7): a user may chat
 * about a roadmap they own OR any public/unlisted one (unlisted is already
 * link-shareable via its slug page). Slug stays nullable — generated maps have
 * none, official maps use it for the context chip's link target.
 */
export async function getRoadmapForChat(
  roadmapId: string,
  userId: string,
): Promise<(Omit<RoadmapPage, "slug"> & { slug: string | null }) | null> {
  const db = getDb();
  const [rm] = await db
    .select()
    .from(roadmaps)
    .where(eq(roadmaps.id, roadmapId))
    .limit(1);
  if (!rm || !rm.currentVersionId) return null;
  const allowed =
    rm.ownerId === userId ||
    rm.visibility === "public" ||
    rm.visibility === "unlisted";
  if (!allowed) return null;

  const payload = await loadRoadmapPayload(rm.id, rm.currentVersionId);
  if (!payload) return null;

  return {
    id: rm.id,
    slug: rm.slug,
    title: rm.title,
    brief: rm.brief,
    category: rm.category,
    isAiGenerated: rm.isAiGenerated ?? false,
    visibility: rm.visibility,
    seo: rm.seo,
    ...payload,
  };
}

/** Shared assembly: current version graph + topics + ordered resources. */
async function loadRoadmapPayload(
  roadmapId: string,
  versionId: string,
): Promise<{ graph: RoadmapGraph; topics: RoadmapTopic[] } | null> {
  const db = getDb();
  const [ver] = await db
    .select()
    .from(roadmapVersions)
    .where(eq(roadmapVersions.id, versionId))
    .limit(1);
  if (!ver) return null;

  const topicRows = await db
    .select()
    .from(topics)
    .where(eq(topics.roadmapId, roadmapId));

  const topicIds = topicRows.map((t) => t.id);
  const resRows = topicIds.length
    ? await db
        .select()
        .from(resources)
        .where(inArray(resources.topicId, topicIds))
        .orderBy(asc(resources.position))
    : [];

  const resByTopic = new Map<string, RoadmapResource[]>();
  for (const r of resRows) {
    const list = resByTopic.get(r.topicId) ?? [];
    list.push({
      kind: r.kind,
      title: r.title,
      url: r.url,
      isPaid: r.isPaid ?? false,
    });
    resByTopic.set(r.topicId, list);
  }

  return {
    graph: ver.graph,
    topics: topicRows.map((t) => ({
      nodeId: t.nodeId,
      slug: t.slug,
      title: t.title,
      bodyMd: t.bodyMd,
      meta: t.meta,
      resources: resByTopic.get(t.id) ?? [],
    })),
  };
}
