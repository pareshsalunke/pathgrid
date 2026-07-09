import "server-only";
import { getModel, type ProviderConfig } from "./registry";
import {
  generateStructured,
  StructuredOutputError,
  type UsageTotals,
} from "./structured";
import { quizPrompts } from "./quiz-prompts";
import { quizGeneration, type QuizQuestion } from "@/lib/schemas/quiz";

/**
 * Quiz generator (doc 06 §3.5, doc 05 §4). A single structured call on the fast tier
 * (quiz = fast in the doc 05 tier table): generate → Zod → one repair, both passes on
 * the fast model. No streaming — the route replies with plain JSON.
 */

export { StructuredOutputError };

// A 5-MCQ quiz with short explanations is small; the cap protects the user's wallet.
const QUIZ_MAX_TOKENS = 1_500;

export async function generateQuiz({
  config,
  title,
  context,
}: {
  config: ProviderConfig;
  title: string;
  context: string | null;
}): Promise<{
  questions: QuizQuestion[];
  usage: UsageTotals;
  repaired: boolean;
}> {
  const model = getModel(config, "fast");
  const { system, prompt } = quizPrompts({ title, context });
  const { data, usage, repaired } = await generateStructured({
    model,
    repairModel: model,
    system,
    prompt,
    schema: quizGeneration,
    maxOutputTokens: QUIZ_MAX_TOKENS,
  });
  return { questions: data.questions, usage, repaired };
}
