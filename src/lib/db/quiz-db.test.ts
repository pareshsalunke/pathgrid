import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import type { RoadmapGraph } from "@/lib/schemas/graph";
import type { QuizQuestion } from "@/lib/schemas/quiz";

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
  meta: { title: "IT Quiz Graph", level: "beginner", estHours: 2 },
  nodes: [
    {
      id: "title",
      type: "title",
      position: { x: 0, y: 0 },
      data: { label: "IT Quiz Graph" },
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

const questions: QuizQuestion[] = Array.from({ length: 4 }, (_, i) => ({
  q: `Q${i}`,
  options: ["a", "b", "c", "d"],
  answerIdx: i % 4,
  why: `because ${i}`,
}));

suite("quizzes/quiz_attempts persistence (Neon)", () => {
  let getDb: typeof import("./index").getDb;
  let schema: typeof import("./schema");
  let quiz: typeof import("./quiz");
  let userId: string;
  let strangerId: string;
  let roadmapId: string;
  let quizId: string;

  beforeAll(async () => {
    ({ getDb } = await import("./index"));
    schema = await import("./schema");
    quiz = await import("./quiz");

    const [u] = await getDb()
      .insert(schema.users)
      .values({
        email: `it-quiz-${Math.floor(Math.random() * 1e9)}@example.com`,
        name: "IT Quiz User",
      })
      .returning({ id: schema.users.id });
    userId = u.id;

    const [s] = await getDb()
      .insert(schema.users)
      .values({
        email: `it-quiz-s-${Math.floor(Math.random() * 1e9)}@example.com`,
        name: "IT Quiz Stranger",
      })
      .returning({ id: schema.users.id });
    strangerId = s.id;

    const { createGeneratedRoadmap } = await import("./generated");
    ({ roadmapId } = await createGeneratedRoadmap({
      userId,
      title: "IT Quiz Graph",
      brief: "quiz integration test",
      graph,
    }));
  });

  afterAll(async () => {
    // Deleting the users cascades their roadmaps → quizzes → attempts.
    if (userId)
      await getDb().delete(schema.users).where(eq(schema.users.id, userId));
    if (strangerId)
      await getDb().delete(schema.users).where(eq(schema.users.id, strangerId));
  });

  it("upserts idempotently on (roadmapId, nodeId) — the cache key", async () => {
    const first = await quiz.upsertQuiz({
      roadmapId,
      nodeId: "a",
      questions,
      model: "m1",
    });
    quizId = first.id;

    const cached = await quiz.getQuiz(roadmapId, "a");
    expect(cached?.id).toBe(quizId);
    expect(cached?.questions).toHaveLength(4);

    // A second generate for the same node replaces in place (same row id).
    const updated = questions.map((q, i) =>
      i === 0 ? { ...q, q: "Changed" } : q,
    );
    const second = await quiz.upsertQuiz({
      roadmapId,
      nodeId: "a",
      questions: updated,
      model: "m2",
    });
    expect(second.id).toBe(quizId);
    const recached = await quiz.getQuiz(roadmapId, "a");
    expect(recached?.questions[0].q).toBe("Changed");
  });

  it("reads a quiz by id (and null on a miss)", async () => {
    const byId = await quiz.getQuizById(quizId);
    expect(byId).toMatchObject({ id: quizId, roadmapId, nodeId: "a" });
    expect(
      await quiz.getQuizById("00000000-0000-0000-0000-000000000000"),
    ).toBeNull();
  });

  it("stores a graded attempt", async () => {
    const { id } = await quiz.createQuizAttempt({
      userId,
      quizId,
      score: 3,
      answers: [0, 1, 2, 3],
    });
    const rows = await getDb()
      .select()
      .from(schema.quizAttempts)
      .where(eq(schema.quizAttempts.id, id));
    expect(rows).toHaveLength(1);
    expect(rows[0].score).toBe(3);
    expect(rows[0].answers).toEqual([0, 1, 2, 3]);
  });

  it("deleting a user drops their attempts but not the (foreign) quiz", async () => {
    const { id } = await quiz.createQuizAttempt({
      userId: strangerId,
      quizId,
      score: 1,
      answers: [0, 0, 0, 0],
    });

    await getDb().delete(schema.users).where(eq(schema.users.id, strangerId));

    const attempts = await getDb()
      .select()
      .from(schema.quizAttempts)
      .where(eq(schema.quizAttempts.id, id));
    expect(attempts).toEqual([]); // gone with the user

    // The quiz belongs to another user's roadmap — it survives.
    expect(await quiz.getQuizById(quizId)).not.toBeNull();
  });

  it("deleting a roadmap cascades its quizzes and their attempts", async () => {
    const { createGeneratedRoadmap } = await import("./generated");
    const { roadmapId: r2 } = await createGeneratedRoadmap({
      userId,
      title: "Doomed Quiz Map",
      brief: "will be deleted",
      graph,
    });
    const { id: q2 } = await quiz.upsertQuiz({
      roadmapId: r2,
      nodeId: "a",
      questions,
      model: "m",
    });
    const { id: a2 } = await quiz.createQuizAttempt({
      userId,
      quizId: q2,
      score: 2,
      answers: [0, 1, 2, 3],
    });

    await getDb().delete(schema.roadmaps).where(eq(schema.roadmaps.id, r2));

    expect(await quiz.getQuizById(q2)).toBeNull(); // quiz cascaded
    const attempts = await getDb()
      .select()
      .from(schema.quizAttempts)
      .where(eq(schema.quizAttempts.id, a2));
    expect(attempts).toEqual([]); // attempt cascaded through the quiz
  });
});
