import { and, eq } from "drizzle-orm";
import { getDb } from "./index";
import { roadmaps, roadmapVersions } from "./schema";
import type { RoadmapGraph } from "@/lib/schemas/graph";

/**
 * Editor writes for owner-edited roadmaps (Phase 5). Autosave updates the CURRENT
 * version's graph IN PLACE — not a new version per save; a debounced editor would
 * otherwise explode roadmap_versions. Versioning stays a pipeline/publish concern
 * (src/lib/db/pipeline.ts). Every write is owner-gated; a non-owner (or missing
 * roadmap) is a no-op returning { ok: false } so the route can 404 without leaking
 * existence. neon-http has no multi-statement transactions — these are sequential
 * idempotent statements.
 */

export async function updateRoadmapGraph({
  roadmapId,
  ownerId,
  graph,
}: {
  roadmapId: string;
  ownerId: string;
  graph: RoadmapGraph;
}): Promise<{ ok: boolean }> {
  const db = getDb();
  const [rm] = await db
    .select({
      ownerId: roadmaps.ownerId,
      currentVersionId: roadmaps.currentVersionId,
    })
    .from(roadmaps)
    .where(eq(roadmaps.id, roadmapId))
    .limit(1);
  if (!rm || rm.ownerId !== ownerId || !rm.currentVersionId)
    return { ok: false };

  await db
    .update(roadmapVersions)
    .set({ graph })
    .where(eq(roadmapVersions.id, rm.currentVersionId));
  await db
    .update(roadmaps)
    .set({ updatedAt: new Date() })
    .where(eq(roadmaps.id, roadmapId));
  return { ok: true };
}

/** Share-by-link: owners flip private↔unlisted only (never public — catalog territory). */
export async function setRoadmapVisibility({
  roadmapId,
  ownerId,
  visibility,
}: {
  roadmapId: string;
  ownerId: string;
  visibility: "private" | "unlisted";
}): Promise<{ ok: boolean }> {
  const db = getDb();
  const rows = await db
    .update(roadmaps)
    .set({ visibility, updatedAt: new Date() })
    .where(and(eq(roadmaps.id, roadmapId), eq(roadmaps.ownerId, ownerId)))
    .returning({ id: roadmaps.id });
  return { ok: rows.length > 0 };
}

/** Inline title edit → the roadmaps.title column (the viewer H1 + library card source). */
export async function setRoadmapTitle({
  roadmapId,
  ownerId,
  title,
}: {
  roadmapId: string;
  ownerId: string;
  title: string;
}): Promise<{ ok: boolean }> {
  const db = getDb();
  const rows = await db
    .update(roadmaps)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(roadmaps.id, roadmapId), eq(roadmaps.ownerId, ownerId)))
    .returning({ id: roadmaps.id });
  return { ok: rows.length > 0 };
}
