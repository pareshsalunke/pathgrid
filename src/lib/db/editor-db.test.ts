import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import type { RoadmapGraph } from "@/lib/schemas/graph";

// Load DATABASE_URL from .env so `pnpm test` can round-trip against Neon; skip if absent.
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

const STRANGER = "00000000-0000-0000-0000-000000000000";

const graphV1: RoadmapGraph = {
  $schema: "pathgrid/roadmap-graph/v1",
  meta: { title: "Editor IT", level: "beginner", estHours: 5 },
  nodes: [
    {
      id: "t",
      type: "title",
      position: { x: 0, y: 0 },
      data: { label: "Editor IT" },
    },
    {
      id: "a",
      type: "topic",
      position: { x: 0, y: 120 },
      data: { label: "A", slug: "a" },
    },
  ],
  edges: [
    {
      id: "e1",
      source: "t",
      target: "a",
      data: { style: "solid", kind: "sequence" },
    },
  ],
};

const graphV2: RoadmapGraph = {
  ...graphV1,
  meta: { ...graphV1.meta, title: "Editor IT v2" },
  nodes: [
    ...graphV1.nodes,
    {
      id: "b",
      type: "topic",
      position: { x: 0, y: 240 },
      data: { label: "B", slug: "b" },
    },
  ],
  edges: [
    ...graphV1.edges,
    {
      id: "e2",
      source: "a",
      target: "b",
      data: { style: "solid", kind: "sequence" },
    },
  ],
};

suite("editor writes + getViewableRoadmapById (Neon)", () => {
  let getDb: typeof import("./index").getDb;
  let schema: typeof import("./schema");
  let editor: typeof import("./editor");
  let roadmapsRepo: typeof import("./roadmaps");
  let userId: string;
  let roadmapId: string;
  let versionId: string;

  beforeAll(async () => {
    ({ getDb } = await import("./index"));
    schema = await import("./schema");
    editor = await import("./editor");
    roadmapsRepo = await import("./roadmaps");
    const generated = await import("./generated");

    const [u] = await getDb()
      .insert(schema.users)
      .values({
        email: `it-editor-${Math.floor(Math.random() * 1e9)}@example.com`,
        name: "IT Editor User",
      })
      .returning({ id: schema.users.id });
    userId = u.id;

    ({ roadmapId } = await generated.createGeneratedRoadmap({
      userId,
      title: "Editor IT",
      brief: "editor integration test",
      graph: graphV1,
    }));

    const [rm] = await getDb()
      .select({ v: schema.roadmaps.currentVersionId })
      .from(schema.roadmaps)
      .where(eq(schema.roadmaps.id, roadmapId));
    versionId = rm.v!;
  });

  afterAll(async () => {
    if (userId)
      await getDb().delete(schema.users).where(eq(schema.users.id, userId));
  });

  it("updateRoadmapGraph updates the current version in place for the owner", async () => {
    const res = await editor.updateRoadmapGraph({
      roadmapId,
      ownerId: userId,
      graph: graphV2,
    });
    expect(res.ok).toBe(true);

    const [ver] = await getDb()
      .select()
      .from(schema.roadmapVersions)
      .where(eq(schema.roadmapVersions.id, versionId));
    expect(ver.graph.nodes).toHaveLength(3); // updated in place, same row
    expect(ver.graph.meta.title).toBe("Editor IT v2");

    // No new version row was created (in-place, not append).
    const versions = await getDb()
      .select()
      .from(schema.roadmapVersions)
      .where(eq(schema.roadmapVersions.roadmapId, roadmapId));
    expect(versions).toHaveLength(1);
  });

  it("updateRoadmapGraph is a no-op for a non-owner", async () => {
    const res = await editor.updateRoadmapGraph({
      roadmapId,
      ownerId: STRANGER,
      graph: graphV1,
    });
    expect(res.ok).toBe(false);

    const [ver] = await getDb()
      .select()
      .from(schema.roadmapVersions)
      .where(eq(schema.roadmapVersions.id, versionId));
    expect(ver.graph.nodes).toHaveLength(3); // still v2 — stranger did not write
  });

  it("getViewableRoadmapById gates a private map: owner yes, others no", async () => {
    const owned = await roadmapsRepo.getViewableRoadmapById(roadmapId, userId);
    expect(owned?.isOwner).toBe(true);
    expect(owned?.title).toBe("Editor IT");

    expect(
      await roadmapsRepo.getViewableRoadmapById(roadmapId, null),
    ).toBeNull();
    expect(
      await roadmapsRepo.getViewableRoadmapById(roadmapId, STRANGER),
    ).toBeNull();
  });

  it("setRoadmapVisibility unlisted → anyone can view (isOwner reflects the viewer)", async () => {
    expect(
      (
        await editor.setRoadmapVisibility({
          roadmapId,
          ownerId: STRANGER,
          visibility: "unlisted",
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await editor.setRoadmapVisibility({
          roadmapId,
          ownerId: userId,
          visibility: "unlisted",
        })
      ).ok,
    ).toBe(true);

    const anon = await roadmapsRepo.getViewableRoadmapById(roadmapId, null);
    expect(anon?.isOwner).toBe(false);
    expect(anon?.visibility).toBe("unlisted");

    const owner = await roadmapsRepo.getViewableRoadmapById(roadmapId, userId);
    expect(owner?.isOwner).toBe(true);
  });

  it("setRoadmapTitle updates the roadmaps.title column for the owner", async () => {
    expect(
      (
        await editor.setRoadmapTitle({
          roadmapId,
          ownerId: STRANGER,
          title: "Nope",
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await editor.setRoadmapTitle({
          roadmapId,
          ownerId: userId,
          title: "Renamed",
        })
      ).ok,
    ).toBe(true);

    const view = await roadmapsRepo.getViewableRoadmapById(roadmapId, userId);
    expect(view?.title).toBe("Renamed");
  });
});
