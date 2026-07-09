import "server-only";
import {
  validateGraph,
  type RoadmapGraph,
  type GraphNode,
} from "@/lib/schemas/graph";
import { layoutGraph } from "@/lib/layout";
import { getModel, type ProviderConfig } from "./registry";
import {
  generateStructured,
  StructuredOutputError,
  type UsageTotals,
} from "./structured";
import {
  outlinePrompts,
  outlineSchema,
  graphifyPrompts,
  graphifySchema,
  type RoadmapInput,
} from "./roadmap-prompts";

/**
 * Two-pass personalized roadmap generation (docs/06 §3.6): outline (smart tier)
 * → graphify (smart, repair on fast) → deterministic meta → shared Zod graph
 * validation → elkjs layout baked into the stored graph. The onProgress callback
 * keeps transport (SSE) out of this core so it unit-tests without streams.
 */

export type GenerationStep = "outline" | "graphify" | "layout";

// Wallet-protection caps per call (docs/05 §4); generous for large graphs.
const OUTLINE_MAX_TOKENS = 4_000;
const GRAPHIFY_MAX_TOKENS = 16_000;

/** meta.level enum is beginner|mixed|advanced (doc 04 §3) — map UI "intermediate". */
const LEVEL_TO_META: Record<
  RoadmapInput["level"],
  RoadmapGraph["meta"]["level"]
> = {
  beginner: "beginner",
  intermediate: "mixed",
  advanced: "advanced",
};

export class GenerationInvalidError extends Error {
  readonly issues: string[];
  readonly usage: UsageTotals;
  constructor(issues: string[], usage: UsageTotals) {
    super("generated graph failed validation");
    this.name = "GenerationInvalidError";
    this.issues = issues;
    this.usage = usage;
  }
}

export type GeneratedRoadmap = {
  graph: RoadmapGraph;
  title: string;
  usage: UsageTotals;
};

export async function generateRoadmap({
  config,
  input,
  onProgress,
}: {
  config: ProviderConfig;
  input: RoadmapInput;
  onProgress?: (step: GenerationStep) => void;
}): Promise<GeneratedRoadmap> {
  const smart = getModel(config, "smart");
  const fast = getModel(config, "fast");
  const usage: UsageTotals = { inputTokens: 0, outputTokens: 0, calls: 0 };

  // Pass 1 — outline (pedagogy happens here, docs/06 §2).
  onProgress?.("outline");
  const outlineMsgs = outlinePrompts(input);
  const outline = await generateStructured({
    model: smart,
    repairModel: fast,
    system: outlineMsgs.system,
    prompt: outlineMsgs.prompt,
    schema: outlineSchema,
    maxOutputTokens: OUTLINE_MAX_TOKENS,
  });
  addUsage(usage, outline.usage);

  // Pass 2 — graphify (mechanical conversion).
  onProgress?.("graphify");
  const graphifyMsgs = graphifyPrompts(outline.data);
  const graphify = await generateStructured({
    model: smart,
    repairModel: fast,
    system: graphifyMsgs.system,
    prompt: graphifyMsgs.prompt,
    schema: graphifySchema,
    maxOutputTokens: GRAPHIFY_MAX_TOKENS,
  });
  addUsage(usage, graphify.usage);

  // Meta is built by us, never trusted from the model.
  const graph: RoadmapGraph = {
    $schema: "pathgrid/roadmap-graph/v1",
    meta: {
      title: outline.data.title,
      level: LEVEL_TO_META[input.level],
      estHours: input.hoursPerWeek * 12,
    },
    nodes: graphify.data.nodes,
    edges: graphify.data.edges,
  };

  // Shared gate (CLAUDE.md: never render a graph that failed Zod). The structural
  // superRefine rules (connectivity, cycles…) run here on the assembled graph.
  const checked = validateGraph(graph);
  if (!checked.success) {
    throw new GenerationInvalidError(
      checked.error.issues.map(
        (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
      ),
      usage,
    );
  }

  // Layout at generation time so the stored graph is render-ready (positions are
  // part of the saved version; width/height stay derived from NODE_SIZE at render).
  onProgress?.("layout");
  const positioned = await layoutGraph(checked.data.nodes, checked.data.edges);
  const nodes: GraphNode[] = positioned.map(
    ({ id, type, data, parentId, position }) => ({
      id,
      type,
      data,
      ...(parentId !== undefined ? { parentId } : {}),
      position,
    }),
  );

  return {
    graph: { ...checked.data, nodes },
    title: outline.data.title,
    usage,
  };
}

function addUsage(total: UsageTotals, part: UsageTotals): void {
  total.inputTokens += part.inputTokens;
  total.outputTokens += part.outputTokens;
  total.calls += part.calls;
}

export { StructuredOutputError };
