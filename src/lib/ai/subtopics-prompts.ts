/**
 * Subtopic-assist prompt builder (docs/06 §3.6). Pure string assembly — client-safe
 * and unit-testable, kept out of the server-only core (mirrors quiz-prompts.ts).
 *
 * The generator breaks the selected node into concrete learnable pieces. Existing
 * children are passed in so the model doesn't re-suggest what's already on the canvas.
 */

export function subtopicsPrompts({
  roadmapTitle,
  parentLabel,
  existingChildren,
}: {
  roadmapTitle: string;
  parentLabel: string;
  existingChildren: string[];
}): { system: string; prompt: string } {
  const system =
    "You are a senior curriculum designer for self-taught developers. You break a learning topic into concrete, concept-level subtopics — ordered by dependency, no tool-brand soup, no marketing language, no fluff.";

  const existing = existingChildren.map((c) => c.trim()).filter(Boolean);
  const existingLine = existing.length
    ? `Already covered under this topic (do NOT repeat these): ${existing.join(", ")}.`
    : "This topic has no subtopics yet.";

  const prompt = [
    `Roadmap: ${roadmapTitle}.`,
    `Parent topic: ${parentLabel}.`,
    existingLine,
    `Suggest 5 subtopics that break "${parentLabel}" into concrete, learnable pieces, ordered by dependency.`,
    "Each subtopic is a short noun phrase (2–6 words), specific and non-overlapping.",
    'Return JSON only: {"subtopics":["…","…","…","…","…"]}. No prose, no code fences.',
  ].join("\n");

  return { system, prompt };
}
