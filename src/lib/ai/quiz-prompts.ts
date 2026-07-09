/**
 * Quiz prompt builder (doc 06 §3.5). Pure string assembly — client-safe and
 * unit-testable, kept out of the server-only orchestrator (mirrors chat-prompts.ts).
 */

export function quizPrompts({
  title,
  context,
}: {
  title: string;
  context: string | null;
}): { system: string; prompt: string } {
  const system =
    "You write fair multiple-choice questions that test understanding, not trivia.";

  // Official topics pass their stored body; generated maps have none, so fall back
  // to the label + standard curriculum (mirrors the item-5 tutor unlock).
  const contextLine = context?.trim()
    ? `Context: ${context.trim()}`
    : "Context: no stored description — base the questions on the topic title and the standard curriculum for it.";

  const prompt = [
    `Topic: ${title}.`,
    contextLine,
    'Write JSON: {"questions":[5 × {"q":str,"options":[4 strings, one correct, distractors plausible],"answerIdx":0-3,"why":"1–2 sentence explanation"}]}.',
    "Vary difficulty: 2 recall, 2 application, 1 tricky-but-fair.",
    "Return JSON only — no prose, no code fences.",
  ].join("\n");

  return { system, prompt };
}
