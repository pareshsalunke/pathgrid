/**
 * Client-safe slug helpers for the editor. The AI pipeline gets slugs from the
 * model; hand-editing a graph needs a local kebab-case slugifier so that every
 * topic/subtopic node keeps a non-empty slug (roadmapGraph.superRefine requires
 * it — src/lib/schemas/graph.ts). No dependency, no server-only imports.
 */

// Unicode combining diacritical marks (left over after NFKD normalization).
const DIACRITICS = /[̀-ͯ]/g;

export function slugify(label: string): string {
  return label
    .normalize("NFKD") // split accented chars into base + combining diacritic
    .replace(DIACRITICS, "") // strip the diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // any run of non-alphanumerics → one hyphen
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
    .slice(0, 60) // keep slugs sane
    .replace(/-+$/, ""); // re-trim if the slice landed on a hyphen
}

/**
 * Make `base` unique within `taken` by appending -2, -3, … A blank base (e.g. an
 * emoji-only label that slugifies to "") falls back to "topic" first.
 */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || "topic";
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}
