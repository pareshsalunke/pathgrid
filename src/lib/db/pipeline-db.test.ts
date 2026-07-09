import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import type { RoadmapGraph } from "@/lib/schemas/graph";
import type { QuizQuestion } from "@/lib/schemas/quiz";
import type { DraftTopic } from "./pipeline";

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

const slug = `it-pipeline-${Math.floor(Math.random() * 1e9)}`;

const graph: RoadmapGraph = {
  $schema: "pathgrid/roadmap-graph/v1",
  meta: { title: "IT Pipeline Graph", level: "beginner", estHours: 6 },
  nodes: [
    {
      id: "title",
      type: "title",
      position: { x: 0, y: 0 },
      data: { label: "IT Pipeline Graph" },
    },
    {
      id: "a",
      type: "topic",
      position: { x: 0, y: 120 },
      data: { label: "A", slug: "a", order: 1 },
    },
    {
      id: "b",
      type: "topic",
      position: { x: 0, y: 240 },
      data: { label: "B", slug: "b", order: 2 },
    },
  ],
  edges: [
    {
      id: "e1",
      source: "title",
      target: "a",
      data: { style: "solid", kind: "sequence" },
    },
    {
      id: "e2",
      source: "a",
      target: "b",
      data: { style: "solid", kind: "sequence" },
    },
  ],
};

const draftTopics: DraftTopic[] = [
  {
    nodeId: "a",
    slug: "a",
    title: "A",
    bodyMd: "Body for A.",
    meta: {
      objectives: ["I can A"],
      pitfalls: ["Rushing A"],
      est_hours: 3,
      generatedBy: {
        model: "m1",
        promptVersion: "seed-v1",
        date: "2026-07-09",
      },
    },
    resources: [
      { kind: "docs", title: "A docs", url: "https://example.com/a" },
    ],
  },
  {
    nodeId: "b",
    slug: "b",
    title: "B",
    bodyMd: "Body for B.",
    meta: { objectives: ["I can B"], pitfalls: ["Rushing B"], est_hours: 3 },
    resources: [],
  },
];

const questions: QuizQuestion[] = Array.from({ length: 4 }, (_, i) => ({
  q: `Q${i}`,
  options: ["a", "b", "c", "d"],
  answerIdx: i % 4,
  why: `because ${i}`,
}));

const seo = {
  metaTitle: "IT Pipeline",
  metaDesc: "test",
  intro_md: "Intro.",
  faqs: [{ q: "Q?", a: "A." }],
};

suite("pipeline draft/publish persistence (Neon)", () => {
  let getDb: typeof import("./index").getDb;
  let schema: typeof import("./schema");
  let repo: typeof import("./pipeline");
  let roadmapId: string;

  beforeAll(async () => {
    ({ getDb } = await import("./index"));
    schema = await import("./schema");
    repo = await import("./pipeline");
  });

  afterAll(async () => {
    // Deleting the roadmap cascades versions, topics, resources, and quizzes.
    if (roadmapId)
      await getDb()
        .delete(schema.roadmaps)
        .where(eq(schema.roadmaps.id, roadmapId));
  });

  it("creates an unlisted AI-drafted roadmap with topics, resources and quizzes", async () => {
    const res = await repo.upsertDraftRoadmap({
      slug,
      title: "IT Pipeline Graph",
      brief: "brief",
      category: "skill",
      seo,
      graph,
      topics: draftTopics,
      quizzes: [{ nodeId: "a", questions, model: "m-fast" }],
    });
    roadmapId = res.roadmapId;
    expect(res.version).toBe(1);

    const [rm] = await getDb()
      .select()
      .from(schema.roadmaps)
      .where(eq(schema.roadmaps.id, roadmapId));
    expect(rm.visibility).toBe("unlisted");
    expect(rm.isAiGenerated).toBe(true);
    expect(rm.ownerId).toBeNull();
    expect(rm.currentVersionId).not.toBeNull();

    const topicRows = await getDb()
      .select()
      .from(schema.topics)
      .where(eq(schema.topics.roadmapId, roadmapId));
    expect(topicRows).toHaveLength(2);
    expect(
      topicRows.find((t) => t.nodeId === "a")?.meta?.generatedBy?.model,
    ).toBe("m1");

    const resourceRows = await getDb()
      .select()
      .from(schema.resources)
      .where(
        eq(
          schema.resources.topicId,
          topicRows.find((t) => t.nodeId === "a")!.id,
        ),
      );
    expect(resourceRows).toHaveLength(1);
    expect(resourceRows[0].status).toBe("verified");

    const quizRows = await getDb()
      .select()
      .from(schema.quizzes)
      .where(eq(schema.quizzes.roadmapId, roadmapId));
    expect(quizRows).toHaveLength(1);
  });

  it("re-seeding appends version 2, replaces topics, upserts the quiz in place", async () => {
    const [beforeQuiz] = await getDb()
      .select({ id: schema.quizzes.id })
      .from(schema.quizzes)
      .where(eq(schema.quizzes.roadmapId, roadmapId));

    const res = await repo.upsertDraftRoadmap({
      slug,
      title: "IT Pipeline Graph v2",
      brief: "brief v2",
      category: "skill",
      seo,
      graph,
      topics: draftTopics.map((t) => ({ ...t, bodyMd: `${t.bodyMd} v2` })),
      quizzes: [{ nodeId: "a", questions, model: "m-fast-2" }],
    });
    expect(res.roadmapId).toBe(roadmapId);
    expect(res.version).toBe(2);

    const [rm] = await getDb()
      .select()
      .from(schema.roadmaps)
      .where(eq(schema.roadmaps.id, roadmapId));
    expect(rm.title).toBe("IT Pipeline Graph v2");
    expect(rm.visibility).toBe("unlisted"); // re-seed never touches visibility

    const versions = await getDb()
      .select()
      .from(schema.roadmapVersions)
      .where(eq(schema.roadmapVersions.roadmapId, roadmapId));
    expect(versions).toHaveLength(2);
    expect(rm.currentVersionId).toBe(versions.find((v) => v.version === 2)!.id);

    const topicRows = await getDb()
      .select()
      .from(schema.topics)
      .where(eq(schema.topics.roadmapId, roadmapId));
    expect(topicRows).toHaveLength(2); // replaced, not duplicated
    expect(topicRows.find((t) => t.nodeId === "a")?.bodyMd).toContain("v2");

    const [afterQuiz] = await getDb()
      .select({ id: schema.quizzes.id, model: schema.quizzes.model })
      .from(schema.quizzes)
      .where(eq(schema.quizzes.roadmapId, roadmapId));
    expect(afterQuiz.id).toBe(beforeQuiz.id); // cache-key upsert, same row
    expect(afterQuiz.model).toBe("m-fast-2");
  });

  it("lists the draft, publishes it, and drops it from the draft list", async () => {
    const drafts = await repo.listDraftRoadmaps();
    expect(drafts.some((d) => d.slug === slug)).toBe(true);

    const published = await repo.publishRoadmap(slug);
    expect(published?.roadmapId).toBe(roadmapId);

    const [rm] = await getDb()
      .select({ visibility: schema.roadmaps.visibility })
      .from(schema.roadmaps)
      .where(eq(schema.roadmaps.id, roadmapId));
    expect(rm.visibility).toBe("public");

    const draftsAfter = await repo.listDraftRoadmaps();
    expect(draftsAfter.some((d) => d.slug === slug)).toBe(false);

    expect(await repo.publishRoadmap("no-such-slug-ever")).toBeNull();
  });
});
