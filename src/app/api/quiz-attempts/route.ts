import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getQuizById, createQuizAttempt } from "@/lib/db/quiz";
import { track } from "@/lib/track";

/**
 * POST /api/quiz-attempts — grade a submitted quiz + store the attempt (docs/04 §4).
 * No model call, so this is session-gated only (not BYOK): grading is a pure server-side
 * comparison against the cached quiz. The response reveals the correct answers + `why`
 * for the review screen — the quiz route deliberately withholds them until here.
 */

const bodySchema = z.object({
  quizId: z.uuid(),
  answers: z.array(z.number().int()),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const { quizId, answers } = parsed.data;

  const quiz = await getQuizById(quizId);
  if (!quiz)
    return NextResponse.json({ error: "quiz_not_found" }, { status: 404 });

  // Exactly one answer per question, each a valid option index.
  const valid =
    answers.length === quiz.questions.length &&
    answers.every((a) => a >= 0 && a <= 3);
  if (!valid)
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const results = quiz.questions.map((question, i) => ({
    correct: answers[i] === question.answerIdx,
    answerIdx: question.answerIdx,
    why: question.why,
  }));
  const score = results.filter((r) => r.correct).length;

  await createQuizAttempt({ userId, quizId, score, answers });
  await track(
    "quiz_attempt",
    { quizId, score, total: quiz.questions.length },
    userId,
  );

  return NextResponse.json({ score, total: quiz.questions.length, results });
}
