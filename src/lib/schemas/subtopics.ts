import { z } from "zod";

/**
 * AI-assist subtopic suggestions (docs/03 §3.5, docs/06 §3.6). Shared client↔server:
 * the server validates model output against this schema, the browser renders the
 * returned titles as a review checklist before inserting them via graph-ops. Pure Zod
 * — no server-only import — so both sides can share it.
 *
 * The model returns bare subtopic titles (not full nodes); the editor turns each into a
 * subtopic node under the selected node. Forgiving 1–8 (the prompt drives "5", the same
 * way quizzes accept 4–6 vs a prompt-5) so a slight over/under-count renders instead of
 * forcing a paid repair pass; `max(8)` caps a runaway insert.
 */
export const subtopicSuggestions = z.object({
  subtopics: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
});
export type SubtopicSuggestions = z.infer<typeof subtopicSuggestions>;
