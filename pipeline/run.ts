import { parseArgs } from "node:util";
import readline from "node:readline/promises";
import type { UsageTotals } from "@/lib/ai/structured";
import { CATALOG, findCatalogEntry } from "./catalog";
import { pipelineProviderConfig } from "./env";
import {
  stepOutline,
  stepGraph,
  stepContent,
  stepResources,
  stepSeo,
  stepQuiz,
  stepCritique,
  stepSeedDraft,
  stepPublish,
  type StepContext,
} from "./steps";

/**
 * Pipeline CLI (docs/08 Phase 4; doc 06 §2):
 *
 *   pnpm pipeline <step> --slug=<slug> [--force] [--yes]
 *
 * Steps: outline | graph | content | resources | seo | quiz | critique |
 *        seed-draft | publish | all (= outline → seed-draft, no publish).
 *
 * Runs under `node --conditions=react-server` so the `server-only` markers in the
 * reused AI core resolve to no-ops (see package.json + DECISIONS.md). Uses YOUR
 * PIPELINE_API_KEY from .env — never a user BYOK key. `publish` flips the draft
 * public on the SHARED local+prod DB, so it asks for confirmation unless --yes.
 */

const STEPS: Record<string, (ctx: StepContext) => Promise<void>> = {
  outline: stepOutline,
  graph: stepGraph,
  content: stepContent,
  resources: stepResources,
  seo: stepSeo,
  quiz: stepQuiz,
  critique: stepCritique,
  "seed-draft": stepSeedDraft,
  publish: stepPublish,
};
const ALL_ORDER = [
  "outline",
  "graph",
  "content",
  "resources",
  "seo",
  "quiz",
  "critique",
  "seed-draft",
] as const;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      slug: { type: "string" },
      force: { type: "boolean", default: false },
      yes: { type: "boolean", default: false },
    },
  });
  const step = positionals[0];
  if (!step || (!STEPS[step] && step !== "all")) {
    console.error(
      `Usage: pnpm pipeline <${[...Object.keys(STEPS), "all"].join("|")}> --slug=<slug> [--force] [--yes]`,
    );
    process.exit(1);
  }
  if (!values.slug) {
    console.error(
      `--slug required. Catalog: ${CATALOG.map((e) => e.slug).join(", ")}`,
    );
    process.exit(1);
  }
  const entry = findCatalogEntry(values.slug);
  if (!entry) {
    console.error(
      `Unknown slug '${values.slug}'. Catalog: ${CATALOG.map((e) => e.slug).join(", ")}`,
    );
    process.exit(1);
  }

  const ctx: StepContext = {
    entry,
    config: pipelineProviderConfig(),
    force: values.force ?? false,
    usage: { inputTokens: 0, outputTokens: 0, calls: 0 } as UsageTotals,
  };
  console.log(
    `pipeline · ${entry.slug} · ${ctx.config.provider} (smart=${ctx.config.models.smart}, fast=${ctx.config.models.fast})`,
  );

  if (step === "publish" && !values.yes) {
    // CLAUDE.md guardrail: publishing hits the shared prod DB — confirm explicitly.
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await rl.question(
      `Publish '${entry.slug}' to the SHARED (prod) database? [y/N] `,
    );
    rl.close();
    if (!/^y(es)?$/i.test(answer.trim())) {
      console.log("aborted — nothing published");
      return;
    }
  }

  const started = Date.now();
  const sequence = step === "all" ? ALL_ORDER : [step];
  for (const name of sequence) {
    await STEPS[name](ctx);
  }

  const secs = Math.round((Date.now() - started) / 1000);
  console.log(
    `done in ${secs}s · ${ctx.usage.calls} calls · ${ctx.usage.inputTokens.toLocaleString()} in / ${ctx.usage.outputTokens.toLocaleString()} out tokens`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
