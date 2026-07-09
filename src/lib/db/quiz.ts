import { and, eq } from "drizzle-orm";
import { getDb } from "./index";
import { quizzes, quizAttempts } from "./schema";
import type { QuizQuestion } from "@/lib/schemas/quiz";

/**
 * Repository for cached quizzes + attempts (doc 04 §2). Quizzes are keyed by
 * (roadmapId, nodeId) — not the doc's `topic_id` — so the one addressing the drawer
 * has works for official and generated maps alike (schema.ts / DECISIONS.md).
 * Sequential awaits: neon-http has no multi-statement transactions.
 */

export type CachedQuiz = {
  id: string;
  roadmapId: string;
  nodeId: string;
  questions: QuizQuestion[];
};

const CACHED_QUIZ_COLUMNS = {
  id: quizzes.id,
  roadmapId: quizzes.roadmapId,
  nodeId: quizzes.nodeId,
  questions: quizzes.questions,
} as const;

/** Cache lookup for POST /api/ai/quiz — null on miss (→ generate). */
export async function getQuiz(
  roadmapId: string,
  nodeId: string,
): Promise<CachedQuiz | null> {
  const db = getDb();
  const [row] = await db
    .select(CACHED_QUIZ_COLUMNS)
    .from(quizzes)
    .where(and(eq(quizzes.roadmapId, roadmapId), eq(quizzes.nodeId, nodeId)))
    .limit(1);
  return row ?? null;
}

/** By-id read for grading (POST /api/quiz-attempts). */
export async function getQuizById(quizId: string): Promise<CachedQuiz | null> {
  const db = getDb();
  const [row] = await db
    .select(CACHED_QUIZ_COLUMNS)
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);
  return row ?? null;
}

/** Insert-or-replace on the (roadmapId, nodeId) cache key — idempotent under a
 *  two-tab race and ready for a future explicit regenerate. */
export async function upsertQuiz({
  roadmapId,
  nodeId,
  questions,
  model,
}: {
  roadmapId: string;
  nodeId: string;
  questions: QuizQuestion[];
  model: string;
}): Promise<{ id: string }> {
  const db = getDb();
  const [row] = await db
    .insert(quizzes)
    .values({ roadmapId, nodeId, questions, model })
    .onConflictDoUpdate({
      target: [quizzes.roadmapId, quizzes.nodeId],
      set: { questions, model },
    })
    .returning({ id: quizzes.id });
  return { id: row.id };
}

export async function createQuizAttempt({
  userId,
  quizId,
  score,
  answers,
}: {
  userId: string;
  quizId: string;
  score: number;
  answers: number[];
}): Promise<{ id: string }> {
  const db = getDb();
  const [row] = await db
    .insert(quizAttempts)
    .values({ userId, quizId, score, answers })
    .returning({ id: quizAttempts.id });
  return { id: row.id };
}
