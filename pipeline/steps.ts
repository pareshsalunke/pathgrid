import { generateStructured, type UsageTotals } from "@/lib/ai/structured";
import { getModel, type ProviderConfig } from "@/lib/ai/registry";
import {
  outlineSchema,
  graphifyPrompts,
  graphifySchema,
  type Outline,
} from "@/lib/ai/roadmap-prompts";
import { generateQuiz } from "@/lib/ai/quiz";
import {
  validateGraph,
  assertOfficialSize,
  type RoadmapGraph,
  type GraphNode,
} from "@/lib/schemas/graph";
import { layoutGraph } from "@/lib/layout";
import type { Seo } from "@/lib/schemas/content";
import type { QuizQuestion } from "@/lib/schemas/quiz";
import {
  PROMPT_VERSION,
  seedOutlinePrompts,
  topicContentPrompts,
  topicContentSchema,
  resourcePrompts,
  resourceSuggestions,
  seoPrompts,
  seoSchema,
  critiquePrompts,
  critiqueSchema,
  type CatalogEntry,
  type TopicContent,
} from "@/lib/pipeline/prompts";
import { pool } from "@/lib/pipeline/pool";
import { verifyUrl } from "@/lib/pipeline/verify-url";
import {
  upsertDraftRoadmap,
  publishRoadmap,
  type DraftResource,
} from "@/lib/db/pipeline";
import { hasOut, readOut, writeOut } from "./io";

/**
 * The 9 pipeline steps (doc 06 §2). Each reads its predecessor's JSON from
 * pipeline/out/<slug>/, calls the pure cores, and writes its own output. Steps skip
 * when their output exists (resume) unless forced; content/resources/quiz also resume
 * per topic inside the file. Smart tier for pedagogy/content, fast for quizzes,
 * repair and critique (doc 05 §4 tier table; doc 06 §4.2 "cheap model").
 */

const CONCURRENCY = 4; // deviation from doc 06 Batch APIs — see DECISIONS.md
const OUTLINE_MAX_TOKENS = 6_000;
const GRAPHIFY_MAX_TOKENS = 16_000;
const CONTENT_MAX_TOKENS = 1_500;
const RESOURCES_MAX_TOKENS = 800;
const SEO_MAX_TOKENS = 3_000;
const CRITIQUE_MAX_TOKENS = 3_000;

/** meta.level enum is beginner|mixed|advanced (doc 04 §3) — map catalog levels. */
const LEVEL_TO_META = {
  beginner: "beginner",
  intermediate: "mixed",
  advanced: "advanced",
} as const;

type ContentMap = Record<string, TopicContent>;
type ResourceMap = Record<string, DraftResource[]>;
type QuizMap = Record<string, { questions: QuizQuestion[]; model: string }>;

export type StepContext = {
  entry: CatalogEntry;
  config: ProviderConfig;
  force: boolean;
  usage: UsageTotals;
};

const log = (step: string, msg: string) => console.log(`[${step}] ${msg}`);

function addUsage(total: UsageTotals, part: UsageTotals): void {
  total.inputTokens += part.inputTokens;
  total.outputTokens += part.outputTokens;
  total.calls += part.calls;
}

function skip(ctx: StepContext, step: string, file: string): boolean {
  if (!ctx.force && hasOut(ctx.entry.slug, file)) {
    log(step, `${file} exists — skipping (use --force to redo)`);
    return true;
  }
  return false;
}

/** Content-bearing nodes in learning order — the unit of steps 4/5/7. */
function contentNodes(graph: RoadmapGraph): GraphNode[] {
  return graph.nodes
    .filter((n) => n.type === "topic" || n.type === "subtopic")
    .sort(
      (a, b) =>
        (a.data.order ?? Number.MAX_SAFE_INTEGER) -
        (b.data.order ?? Number.MAX_SAFE_INTEGER),
    );
}

// ── Step 1: outline ────────────────────────────────────────────────────────────

export async function stepOutline(ctx: StepContext): Promise<void> {
  if (skip(ctx, "outline", "outline.json")) return;
  const { system, prompt } = seedOutlinePrompts(ctx.entry);
  const res = await generateStructured({
    model: getModel(ctx.config, "smart"),
    repairModel: getModel(ctx.config, "fast"),
    system,
    prompt,
    schema: outlineSchema,
    maxOutputTokens: OUTLINE_MAX_TOKENS,
  });
  addUsage(ctx.usage, res.usage);
  writeOut(ctx.entry.slug, "outline.json", res.data);
  const topicCount = res.data.stages.reduce((n, s) => n + s.topics.length, 0);
  log(
    "outline",
    `✓ "${res.data.title}" — ${res.data.stages.length} stages, ${topicCount} topics${res.repaired ? " (repaired)" : ""}`,
  );
}

// ── Steps 2+3: graphify + validate + layout ────────────────────────────────────

export async function stepGraph(ctx: StepContext): Promise<void> {
  if (skip(ctx, "graph", "graph.json")) return;
  const outline = readOut<Outline>(ctx.entry.slug, "outline.json");
  const { system, prompt } = graphifyPrompts(outline);
  const res = await generateStructured({
    model: getModel(ctx.config, "smart"),
    repairModel: getModel(ctx.config, "fast"),
    system,
    prompt,
    schema: graphifySchema,
    maxOutputTokens: GRAPHIFY_MAX_TOKENS,
  });
  addUsage(ctx.usage, res.usage);

  // Meta is built by us, never trusted from the model (generate-roadmap precedent).
  // estHours is provisional here; seed-draft recomputes it from content est_hours.
  const graph: RoadmapGraph = {
    $schema: "pathgrid/roadmap-graph/v1",
    meta: {
      title: outline.title,
      level: LEVEL_TO_META[ctx.entry.level],
      estHours: res.data.nodes.length * 2,
    },
    nodes: res.data.nodes,
    edges: res.data.edges,
  };
  const checked = validateGraph(graph);
  if (!checked.success) {
    throw new Error(
      `graphify output failed validation:\n${checked.error.issues
        .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n")}`,
    );
  }
  // Official catalog size bar (doc 04 §3) — enforced for pipeline output only.
  const sizeErrors = assertOfficialSize(checked.data);
  if (sizeErrors.length) {
    throw new Error(
      `graph fails the official-size bar:\n${sizeErrors.map((e) => `  - ${e}`).join("\n")}\n` +
        "Adjust the catalog angle/level and re-run with --force.",
    );
  }

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
  writeOut(ctx.entry.slug, "graph.json", { ...checked.data, nodes });
  log(
    "graph",
    `✓ ${nodes.length} nodes, ${checked.data.edges.length} edges laid out${res.repaired ? " (repaired)" : ""}`,
  );
}

// ── Step 4: topic content ──────────────────────────────────────────────────────

export async function stepContent(ctx: StepContext): Promise<void> {
  const { slug } = ctx.entry;
  const graph = readOut<RoadmapGraph>(slug, "graph.json");
  const nodes = contentNodes(graph);
  const existing: ContentMap =
    !ctx.force && hasOut(slug, "content.json")
      ? readOut<ContentMap>(slug, "content.json")
      : {};
  const pending = nodes.filter((n) => !existing[n.id]);
  if (!pending.length) {
    log("content", `all ${nodes.length} topics present — skipping`);
    return;
  }
  log("content", `${pending.length}/${nodes.length} topics to generate…`);

  const content: ContentMap = { ...existing };
  let done = 0;
  await pool(pending, CONCURRENCY, async (node) => {
    const idx = nodes.findIndex((n) => n.id === node.id);
    const { system, prompt } = topicContentPrompts({
      roadmapTitle: graph.meta.title,
      topicTitle: node.data.label,
      prevTitle: nodes[idx - 1]?.data.label,
      nextTitle: nodes[idx + 1]?.data.label,
    });
    const res = await generateStructured({
      model: getModel(ctx.config, "smart"),
      repairModel: getModel(ctx.config, "fast"),
      system,
      prompt,
      schema: topicContentSchema,
      maxOutputTokens: CONTENT_MAX_TOKENS,
    });
    addUsage(ctx.usage, res.usage);
    content[node.id] = res.data;
    writeOut(slug, "content.json", content); // incremental — per-topic resume
    done += 1;
    if (done % 10 === 0 || done === pending.length)
      log("content", `${done}/${pending.length} done`);
  });
  log("content", `✓ ${Object.keys(content).length} topic bodies written`);
}

// ── Step 5: resources (Policy A — suggest, then verify) ────────────────────────

export async function stepResources(ctx: StepContext): Promise<void> {
  const { slug } = ctx.entry;
  const graph = readOut<RoadmapGraph>(slug, "graph.json");
  const content = readOut<ContentMap>(slug, "content.json");
  const nodes = contentNodes(graph).filter((n) => content[n.id]);
  const existing: ResourceMap =
    !ctx.force && hasOut(slug, "resources.json")
      ? readOut<ResourceMap>(slug, "resources.json")
      : {};
  const pending = nodes.filter((n) => existing[n.id] === undefined);
  if (!pending.length) {
    log("resources", `all ${nodes.length} topics present — skipping`);
    return;
  }
  log("resources", `${pending.length}/${nodes.length} topics to suggest…`);

  const out: ResourceMap = { ...existing };
  let dropped = 0;
  await pool(pending, CONCURRENCY, async (node) => {
    const { system, prompt } = resourcePrompts({
      roadmapTitle: graph.meta.title,
      topicTitle: node.data.label,
      bodyMd: content[node.id].body_md,
    });
    const res = await generateStructured({
      model: getModel(ctx.config, "smart"),
      repairModel: getModel(ctx.config, "fast"),
      system,
      prompt,
      schema: resourceSuggestions,
      maxOutputTokens: RESOURCES_MAX_TOKENS,
    });
    addUsage(ctx.usage, res.usage);

    // Never publish an unverified URL (doc 06 §2): HEAD-check, drop failures.
    const verified: DraftResource[] = [];
    for (const r of res.data.resources) {
      if (await verifyUrl(r.url)) {
        verified.push({
          kind: r.kind,
          title: r.title,
          url: r.url,
          isPaid: r.is_paid ?? false,
        });
      } else {
        dropped += 1;
      }
    }
    out[node.id] = verified;
    writeOut(slug, "resources.json", out); // incremental — per-topic resume
  });
  const kept = Object.values(out).reduce((n, list) => n + list.length, 0);
  log("resources", `✓ ${kept} verified links kept, ${dropped} dropped`);
}

// ── Step 6: SEO block ──────────────────────────────────────────────────────────

export async function stepSeo(ctx: StepContext): Promise<void> {
  if (skip(ctx, "seo", "seo.json")) return;
  const { system, prompt } = seoPrompts(ctx.entry);
  const res = await generateStructured({
    model: getModel(ctx.config, "smart"),
    repairModel: getModel(ctx.config, "fast"),
    system,
    prompt,
    schema: seoSchema,
    maxOutputTokens: SEO_MAX_TOKENS,
  });
  addUsage(ctx.usage, res.usage);
  writeOut(ctx.entry.slug, "seo.json", res.data);
  log("seo", `✓ meta + intro + ${res.data.faqs.length} FAQs`);
}

// ── Step 7: quizzes (fast tier, real topic bodies as context) ──────────────────

export async function stepQuiz(ctx: StepContext): Promise<void> {
  const { slug } = ctx.entry;
  const graph = readOut<RoadmapGraph>(slug, "graph.json");
  const content = readOut<ContentMap>(slug, "content.json");
  const nodes = contentNodes(graph).filter((n) => content[n.id]);
  const existing: QuizMap =
    !ctx.force && hasOut(slug, "quiz.json")
      ? readOut<QuizMap>(slug, "quiz.json")
      : {};
  const pending = nodes.filter((n) => !existing[n.id]);
  if (!pending.length) {
    log("quiz", `all ${nodes.length} quizzes present — skipping`);
    return;
  }
  log("quiz", `${pending.length}/${nodes.length} quizzes to generate…`);

  const out: QuizMap = { ...existing };
  await pool(pending, CONCURRENCY, async (node) => {
    const res = await generateQuiz({
      config: ctx.config,
      title: node.data.label,
      context: content[node.id].body_md,
    });
    addUsage(ctx.usage, res.usage);
    out[node.id] = {
      questions: res.questions,
      model: ctx.config.models.fast,
    };
    writeOut(slug, "quiz.json", out); // incremental — per-topic resume
  });
  log("quiz", `✓ ${Object.keys(out).length} quizzes written`);
}

// ── Step 8a: critique pass (doc 06 §4.2 — attached to the review page) ─────────

export async function stepCritique(ctx: StepContext): Promise<void> {
  if (skip(ctx, "critique", "critique.json")) return;
  const { slug } = ctx.entry;
  const outline = readOut<Outline>(slug, "outline.json");
  const content = readOut<ContentMap>(slug, "content.json");

  const digest = [
    ...outline.stages.map(
      (s, i) =>
        `STAGE ${i + 1}: ${s.name} — ${s.topics
          .map((t) => t.title + (t.optional ? " (optional)" : ""))
          .join(", ")}`,
    ),
    "",
    ...Object.entries(content).map(
      ([nodeId, c]) => `### ${nodeId}\n${c.body_md.slice(0, 300)}`,
    ),
  ]
    .join("\n")
    .slice(0, 30_000);

  const { system, prompt } = critiquePrompts({
    title: outline.title,
    digest,
  });
  const fast = getModel(ctx.config, "fast"); // "cheap model" per the doc
  const res = await generateStructured({
    model: fast,
    repairModel: fast,
    system,
    prompt,
    schema: critiqueSchema,
    maxOutputTokens: CRITIQUE_MAX_TOKENS,
  });
  addUsage(ctx.usage, res.usage);
  writeOut(slug, "critique.json", res.data);
  const high = res.data.findings.filter((f) => f.severity === "high").length;
  log(
    "critique",
    `✓ ${res.data.findings.length} findings (${high} high) — review at /admin/pipeline`,
  );
}

// ── Step 8b: seed the draft (unlisted) into the shared DB ──────────────────────

export async function stepSeedDraft(ctx: StepContext): Promise<void> {
  const { slug } = ctx.entry;
  if (skip(ctx, "seed-draft", "seeded.json")) return;
  const graph = readOut<RoadmapGraph>(slug, "graph.json");
  const content = readOut<ContentMap>(slug, "content.json");
  const resourceMap: ResourceMap = hasOut(slug, "resources.json")
    ? readOut<ResourceMap>(slug, "resources.json")
    : {};
  const quizMap: QuizMap = hasOut(slug, "quiz.json")
    ? readOut<QuizMap>(slug, "quiz.json")
    : {};
  const seo = readOut<Seo>(slug, "seo.json");

  const nodes = contentNodes(graph).filter((n) => content[n.id]);
  const generatedBy = {
    model: ctx.config.models.smart,
    promptVersion: PROMPT_VERSION,
    date: new Date().toISOString().slice(0, 10),
  };

  // Final estHours = the sum the content pass actually estimated (doc 06 §3.3).
  const estHours = Math.max(
    1,
    Math.round(nodes.reduce((n, node) => n + content[node.id].est_hours, 0)),
  );

  const { roadmapId, version } = await upsertDraftRoadmap({
    slug,
    title: graph.meta.title,
    brief: ctx.entry.brief,
    category: ctx.entry.category,
    seo,
    graph: { ...graph, meta: { ...graph.meta, estHours } },
    topics: nodes.map((n) => ({
      nodeId: n.id,
      slug: n.data.slug!,
      title: n.data.label,
      bodyMd: content[n.id].body_md,
      meta: {
        objectives: content[n.id].objectives,
        pitfalls: content[n.id].pitfalls,
        est_hours: content[n.id].est_hours,
        generatedBy,
      },
      resources: resourceMap[n.id] ?? [],
    })),
    quizzes: Object.entries(quizMap).map(([nodeId, q]) => ({
      nodeId,
      questions: q.questions,
      model: q.model,
    })),
  });
  writeOut(slug, "seeded.json", {
    roadmapId,
    version,
    seededAt: new Date().toISOString(),
  });
  log(
    "seed-draft",
    `✓ draft v${version} in DB (unlisted) — review at /${slug} and /admin/pipeline`,
  );
}

// ── Step 9: publish (prod-facing — the CLI confirms before calling this) ───────

export async function stepPublish(ctx: StepContext): Promise<void> {
  const { slug } = ctx.entry;
  const published = await publishRoadmap(slug);
  if (!published) throw new Error(`no roadmap with slug '${slug}' to publish`);
  log("publish", `✓ '${slug}' is now public`);

  // Best-effort ISR revalidation (doc 05 §3): home, the page, and the sitemap.
  const base =
    process.env.REVALIDATE_URL?.trim() || process.env.APP_URL?.trim();
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (!base || !secret) {
    log(
      "publish",
      "REVALIDATE_URL/APP_URL or REVALIDATE_SECRET unset — pages refresh on next deploy",
    );
    return;
  }
  try {
    const res = await fetch(`${base}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret, slug }),
      signal: AbortSignal.timeout(10_000),
    });
    log(
      "publish",
      res.ok
        ? `✓ revalidated home + /${slug} + sitemap on ${base}`
        : `revalidate call failed (${res.status}) — pages refresh on next deploy`,
    );
  } catch {
    log("publish", `could not reach ${base} — pages refresh on next deploy`);
  }
}
