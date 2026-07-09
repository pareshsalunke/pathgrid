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
  meta: { title: "IT Graph", level: "beginner", estHours: 2 },
  nodes: [
    {
      id: "title",
      type: "title",
      position: { x: 0, y: 0 },
      data: { label: "IT Graph" },
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

suite("generated roadmap persistence (Neon)", () => {
  let getDb: typeof import("./index").getDb;
  let schema: typeof import("./schema");
  let generated: typeof import("./generated");
  let userId: string;
  let roadmapId: string;

  beforeAll(async () => {
    ({ getDb } = await import("./index"));
    schema = await import("./schema");
    generated = await import("./generated");

    const [u] = await getDb()
      .insert(schema.users)
      .values({
        email: `it-gen-${Math.floor(Math.random() * 1e9)}@example.com`,
        name: "IT Gen User",
      })
      .returning({ id: schema.users.id });
    userId = u.id;
  });

  afterAll(async () => {
    // Deleting the user cascades roadmaps (ownerId FK) and generated_items (userId FK).
    if (userId)
      await getDb().delete(schema.users).where(eq(schema.users.id, userId));
  });

  it("creates roadmap + version + currentVersionId + generated_items", async () => {
    ({ roadmapId } = await generated.createGeneratedRoadmap({
      userId,
      title: "IT Graph",
      brief: "integration test goal",
      graph,
    }));

    const [rm] = await getDb()
      .select()
      .from(schema.roadmaps)
      .where(eq(schema.roadmaps.id, roadmapId));
    expect(rm.ownerId).toBe(userId);
    expect(rm.visibility).toBe("private");
    expect(rm.isAiGenerated).toBe(true);
    expect(rm.slug).toBeNull();
    expect(rm.category).toBe("custom");
    expect(rm.currentVersionId).toBeTruthy();

    const [ver] = await getDb()
      .select()
      .from(schema.roadmapVersions)
      .where(eq(schema.roadmapVersions.id, rm.currentVersionId!));
    expect(ver.roadmapId).toBe(roadmapId);
    expect(ver.version).toBe(1);
    expect(ver.graph.meta.title).toBe("IT Graph");
    expect(ver.graph.nodes[0].position).toBeDefined();

    const items = await getDb()
      .select()
      .from(schema.generatedItems)
      .where(eq(schema.generatedItems.userId, userId));
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("roadmap");
    expect(items[0].payloadRef).toBe(roadmapId);
  });
});
