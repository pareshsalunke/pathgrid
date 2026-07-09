import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { listRoadmapSlugs } from "@/lib/db/roadmaps";

/**
 * Sitemap (docs/08 Phase 4: publish → "sitemap rebuild"). Public roadmaps only —
 * `listRoadmapSlugs` filters visibility, so unlisted pipeline drafts never appear.
 * Rebuilt on publish via POST /api/revalidate → revalidatePath('/sitemap.xml').
 * Indexing itself stays governed by SEO_INDEXING (site-wide noindex until launch).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await listRoadmapSlugs();
  return [
    { url: env.appUrl, changeFrequency: "weekly", priority: 1 },
    ...slugs.map((slug) => ({
      url: `${env.appUrl}/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
