import "server-only";
import { getModel, type ProviderConfig } from "./registry";
import {
  generateStructured,
  StructuredOutputError,
  type UsageTotals,
} from "./structured";
import { subtopicsPrompts } from "./subtopics-prompts";
import { subtopicSuggestions } from "@/lib/schemas/subtopics";

/**
 * Subtopic-assist generator (docs/03 §3.5, docs/06 §3.6, docs/05 §4). A single
 * structured call on the fast tier (short, mechanical generation): generate → Zod →
 * one repair, both passes on the fast model. No streaming — the route replies with
 * plain JSON. Nothing is persisted; the editor holds the graph and inserts the result.
 */

export { StructuredOutputError };

// ~5 short titles — the cap protects the user's wallet on their own key.
const SUBTOPICS_MAX_TOKENS = 600;

export async function generateSubtopics({
  config,
  roadmapTitle,
  parentLabel,
  existingChildren,
}: {
  config: ProviderConfig;
  roadmapTitle: string;
  parentLabel: string;
  existingChildren: string[];
}): Promise<{
  subtopics: string[];
  usage: UsageTotals;
  repaired: boolean;
}> {
  const model = getModel(config, "fast");
  const { system, prompt } = subtopicsPrompts({
    roadmapTitle,
    parentLabel,
    existingChildren,
  });
  const { data, usage, repaired } = await generateStructured({
    model,
    repairModel: model,
    system,
    prompt,
    schema: subtopicSuggestions,
    maxOutputTokens: SUBTOPICS_MAX_TOKENS,
  });
  return { subtopics: data.subtopics, usage, repaired };
}
