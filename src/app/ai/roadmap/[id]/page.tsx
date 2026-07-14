import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Container } from "@/components/layout/Container";
import { RoadmapView } from "@/components/roadmap/RoadmapView";
import { ProgressMeter } from "@/components/roadmap/ProgressMeter";
import type { DrawerTopic } from "@/components/roadmap/types";
import { getViewableRoadmapById } from "@/lib/db/roadmaps";
import { NODE_SIZE, type PositionedNode } from "@/lib/node-size";

/**
 * Viewer for generated roadmaps (docs/03 §2 /ai/roadmap/[id]). Serves the owner OR
 * anyone with the link when the map is unlisted/public (Phase 5 share-by-link) — a
 * private map to a non-owner 404s. Reuses the slug page's canvas composition, but:
 * auth-gated instead of SSG, stored positions instead of an elk pass, and
 * synthesized drawer topics (label-only — generated maps have no topics rows).
 */

export const metadata: Metadata = {
  title: "Your generated roadmap",
  robots: { index: false }, // user content — never indexable, even when shared
};

type Params = { params: Promise<{ id: string }> };

export default async function GeneratedRoadmapPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  const rm = await getViewableRoadmapById(id, session?.user?.id ?? null);
  if (!rm) notFound();

  // Positions were baked in at generation time — just add render dimensions.
  const nodes: PositionedNode[] = rm.graph.nodes.map((n) => ({
    ...n,
    position: n.position ?? { x: 0, y: 0 },
    ...NODE_SIZE[n.type],
  }));
  const contentNodes = nodes.filter(
    (n) => n.type === "topic" || n.type === "subtopic",
  );
  const contentNodeIds = contentNodes.map((n) => n.id);

  const topics: Record<string, DrawerTopic> = Object.fromEntries(
    contentNodes.map((n) => {
      const order = n.data.order;
      const eyebrow =
        n.type === "subtopic"
          ? "Subtopic"
          : `Topic ${order ? String(order).padStart(2, "0") : ""}`.trim();
      const drawer: DrawerTopic = {
        nodeId: n.id,
        eyebrow,
        title: n.data.label,
        bodyHtml: "",
        resources: [],
      };
      return [n.id, drawer] as const;
    }),
  );

  return (
    <div className="bg-canvas text-ink flex min-h-screen flex-col">
      <AppHeader className="sticky top-0 z-50" />

      <section className="border-hairline border-b">
        <Container className="flex flex-col gap-4 py-8">
          <Link
            href="/ai"
            className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase no-underline hover:underline"
          >
            ← AI hub
          </Link>
          <div className="flex flex-col gap-2">
            <h1 className="font-headline text-[clamp(28px,4vw,40px)] tracking-[-0.02em]">
              {rm.title}
            </h1>
            {rm.brief && (
              <p className="font-body-sm text-ink/75 max-w-[560px] text-[16px]">
                {rm.brief}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <ProgressMeter roadmapId={rm.id} contentNodeIds={contentNodeIds} />
            <span className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase">
              {contentNodeIds.length} topics
            </span>
            <span className="text-ink/55 font-mono text-[10px] tracking-[0.5px] uppercase">
              AI-drafted · review before you rely on it
            </span>
            {rm.isOwner && (
              <Link
                href={`/editor/${rm.id}`}
                className="border-ink text-ink hover:bg-block-lilac ml-auto rounded-full border-2 px-4 py-1.5 text-[13px] font-[500] no-underline transition-colors"
              >
                Edit
              </Link>
            )}
          </div>
        </Container>
      </section>

      <RoadmapView
        roadmapId={rm.id}
        nodes={nodes}
        edges={rm.graph.edges}
        topics={topics}
      />

      <div className="mt-auto">
        <AppFooter />
      </div>
    </div>
  );
}
