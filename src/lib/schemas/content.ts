import { z } from "zod";

/** Topic + resource + SEO content shapes (docs/04 §2, docs/06 §3). */

/** Provenance stamp for pipeline-generated content (doc 06 §4.5) — jsonb-only,
 *  no migration; lives inside topics.meta. */
export const generatedBy = z.object({
  model: z.string(),
  promptVersion: z.string(),
  date: z.string(), // YYYY-MM-DD
});
export type GeneratedBy = z.infer<typeof generatedBy>;

export const topicMeta = z.object({
  objectives: z.array(z.string()).optional(),
  pitfalls: z.array(z.string()).optional(),
  est_hours: z.number().optional(),
  generatedBy: generatedBy.optional(),
});
export type TopicMeta = z.infer<typeof topicMeta>;

export const resourceKind = z.enum([
  "article",
  "video",
  "docs",
  "course",
  "book",
]);
export type ResourceKind = z.infer<typeof resourceKind>;

export const resourceStatus = z.enum(["unverified", "verified", "dead"]);
export type ResourceStatus = z.infer<typeof resourceStatus>;

export const resourceInput = z.object({
  kind: resourceKind,
  title: z.string().min(1),
  url: z.string().min(1),
  is_paid: z.boolean().optional(),
  position: z.number().optional(),
  status: resourceStatus.optional(),
});
export type ResourceInput = z.infer<typeof resourceInput>;

export const seo = z.object({
  metaTitle: z.string(),
  metaDesc: z.string(),
  intro_md: z.string(),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })),
});
export type Seo = z.infer<typeof seo>;
