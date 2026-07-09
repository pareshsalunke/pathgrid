import type { CatalogEntry } from "@/lib/pipeline/prompts";

/**
 * The official catalog (doc 06 §2's catalog.yaml, as a typed module — DECISIONS.md).
 * Launch wedge: PM / leadership paths (user decision, Phase 4 — resolves the doc 02
 * launch-niche question). Add an entry here + run the pipeline to grow the catalog.
 */
export const CATALOG: CatalogEntry[] = [
  {
    slug: "product-manager",
    title: "Product Manager",
    category: "role",
    level: "beginner",
    angle:
      "zero-to-PM foundation for career switchers; no prior product experience assumed",
    brief:
      "The end-to-end foundation path: discovery, delivery, and everything between.",
  },
  {
    slug: "technical-product-manager",
    title: "Technical Product Manager",
    category: "role",
    level: "intermediate",
    angle:
      "for engineers or PMs moving into technical product ownership; assumes exposure to how software teams ship",
    brief:
      "Own technical products credibly: architecture literacy, APIs, and platform thinking.",
  },
  {
    slug: "ai-product-manager",
    title: "AI Product Manager",
    category: "role",
    level: "intermediate",
    angle: "PMs adding AI/LLM product skills; assumes core PM fundamentals",
    brief:
      "Ship AI products: model capabilities, evals, UX patterns, and responsible launches.",
  },
  {
    slug: "system-design",
    title: "System Design",
    category: "skill",
    level: "intermediate",
    angle:
      "practical system design for interviews and architecture reviews; assumes basic programming",
    brief:
      "From requirements to architecture: scaling, storage, and trade-off thinking.",
  },
  {
    slug: "leadership-high-performance-teams",
    title: "Leadership & High-Performance Teams",
    category: "skill",
    level: "intermediate",
    angle:
      "for new and aspiring leads building, coaching, and running high-performing teams",
    brief:
      "Lead teams that ship: coaching, feedback, delegation, and team health.",
  },
  {
    slug: "pm-behavioral-interviews",
    title: "PM Behavioral Interviews",
    category: "skill",
    level: "beginner",
    angle:
      "behavioral interview prep for PM roles: story bank, STAR structure, leveling expectations",
    brief:
      "Turn your experience into interview-ready stories that land at the right level.",
  },
];

export function findCatalogEntry(slug: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.slug === slug);
}
