import { z } from "zod";

/**
 * Quiz question shapes (doc 04 §2 `quizzes.questions`, doc 06 §3.5). Shared
 * client↔server: the server validates model output against `quizQuestions`, the
 * browser renders the answer-stripped `QuizQuestionPublic`. Pure Zod — no
 * server-only import — so both sides can share it.
 */

export const quizQuestion = z.object({
  q: z.string().min(1),
  options: z.array(z.string().min(1)).length(4), // exactly 4 (doc 06 §3.5)
  answerIdx: z.number().int().min(0).max(3),
  why: z.string().min(1),
});
export type QuizQuestion = z.infer<typeof quizQuestion>;

/**
 * A generated quiz. Doc 06 §3.5 asks for 5 (2 recall / 2 application / 1
 * tricky-but-fair); we accept 4–6 so a slightly over/under-count return renders
 * fine instead of forcing a paid repair pass or a hard failure on the user's key
 * (DECISIONS.md). The prompt still drives "5".
 */
export const quizQuestions = z.array(quizQuestion).min(4).max(6);
export type QuizQuestions = z.infer<typeof quizQuestions>;

/** The model-output shape (doc 06 §3.5 returns a `{questions:[…]}` wrapper); the bare
 *  `quizQuestions` array is what we store in `quizzes.questions`. */
export const quizGeneration = z.object({ questions: quizQuestions });
export type QuizGeneration = z.infer<typeof quizGeneration>;

/**
 * Answer-stripped question sent to the browser — `answerIdx`/`why` are revealed
 * only after grading via `POST /api/quiz-attempts`, keeping answers out of the
 * client bundle.
 */
export type QuizQuestionPublic = { q: string; options: string[] };

export function toPublicQuestions(
  questions: QuizQuestion[],
): QuizQuestionPublic[] {
  return questions.map((q) => ({ q: q.q, options: q.options }));
}
