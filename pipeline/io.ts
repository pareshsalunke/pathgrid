import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Resumable step outputs (doc 06 §2: "store intermediate JSON in /pipeline/out/<slug>/
 * so a failed step 5 doesn't redo steps 1–4"). The directory is gitignored — outputs
 * are local working artifacts; the DB is the source of truth after seed-draft.
 */

const OUT_ROOT = path.join(process.cwd(), "pipeline", "out");

export function outPath(slug: string, file: string): string {
  const dir = path.join(OUT_ROOT, slug);
  mkdirSync(dir, { recursive: true });
  return path.join(dir, file);
}

export function hasOut(slug: string, file: string): boolean {
  return existsSync(path.join(OUT_ROOT, slug, file));
}

export function readOut<T>(slug: string, file: string): T {
  return JSON.parse(readFileSync(outPath(slug, file), "utf8")) as T;
}

export function writeOut(slug: string, file: string, data: unknown): void {
  writeFileSync(outPath(slug, file), `${JSON.stringify(data, null, 2)}\n`);
}
