import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Container } from "@/components/layout/Container";
import { RoadmapView } from "@/components/roadmap/RoadmapView";
import { ProgressMeter } from "@/components/roadmap/ProgressMeter";
import type { DrawerTopic } from "@/components/roadmap/types";
import {
  getRoadmapBySlug,
  listRoadmapSlugs,
  listCatalog,
} from "@/lib/db/roadmaps";
import { layoutGraph } from "@/lib/layout";
import { renderMarkdown } from "@/lib/markdown";

type Params = { params: Promise<{ roadmapSlug: string }> };

export async function generateStaticParams() {
  const slugs = await listRoadmapSlugs();
  return slugs.map((roadmapSlug) => ({ roadmapSlug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { roadmapSlug } = await params;
  const rm = await getRoadmapBySlug(roadmapSlug);
  if (!rm) return {};
  return {
    title: rm.seo?.metaTitle ?? rm.title,
    description: rm.seo?.metaDesc ?? rm.brief ?? undefined,
    alternates: { canonical: `/${rm.slug}` },
  };
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default async function RoadmapPage({ params }: Params) {
  const { roadmapSlug } = await params;
  const rm = await getRoadmapBySlug(roadmapSlug);
  if (!rm) notFound();

  const nodes = await layoutGraph(rm.graph.nodes, rm.graph.edges);
  const contentNodes = nodes.filter(
    (n) => n.type === "topic" || n.type === "subtopic",
  );
  const contentNodeIds = contentNodes.map((n) => n.id);

  const topicByNode = new Map(rm.topics.map((t) => [t.nodeId, t]));
  const drawerEntries = await Promise.all(
    contentNodes.map(async (n) => {
      const t = topicByNode.get(n.id);
      const order = n.data.order;
      const eyebrow =
        n.type === "subtopic"
          ? "Subtopic"
          : `Topic ${order ? String(order).padStart(2, "0") : ""}`.trim();
      const drawer: DrawerTopic = {
        nodeId: n.id,
        eyebrow,
        title: t?.title ?? n.data.label,
        bodyHtml: await renderMarkdown(t?.bodyMd ?? ""),
        resources: (t?.resources ?? []).map((r) => ({
          kind: r.kind,
          title: r.title,
          url: r.url,
          domain: domainOf(r.url),
        })),
      };
      return [n.id, drawer] as const;
    }),
  );
  const topics: Record<string, DrawerTopic> = Object.fromEntries(drawerEntries);

  const introHtml = rm.seo?.intro_md
    ? await renderMarkdown(rm.seo.intro_md)
    : "";
  const faqs = rm.seo?.faqs ?? [];

  const catalog = await listCatalog();
  const related = [...catalog.role, ...catalog.skill]
    .filter((c) => c.slug !== rm.slug)
    .slice(0, 4);

  const faqJsonLd = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  return (
    <div className="bg-canvas text-ink flex min-h-screen flex-col">
      <AppHeader className="sticky top-0 z-50" />

      <section className="border-hairline border-b">
        <Container className="flex flex-col gap-4 py-8">
          <Link
            href="/"
            className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase no-underline hover:underline"
          >
            ← All roadmaps
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
          </div>
        </Container>
      </section>

      <RoadmapView
        roadmapId={rm.id}
        nodes={nodes}
        edges={rm.graph.edges}
        topics={topics}
      />

      {(introHtml || faqs.length > 0) && (
        <section>
          <Container className="flex flex-col gap-10 py-14">
            {introHtml && (
              <div
                className="font-body-sm text-ink max-w-[720px] text-[17px] leading-[1.6] [&_p]:mb-4 [&_strong]:font-[540]"
                dangerouslySetInnerHTML={{ __html: introHtml }}
              />
            )}
            {faqs.length > 0 && (
              <div className="max-w-[720px]">
                <h2 className="mb-5 font-mono text-[13px] tracking-[0.6px] uppercase">
                  FAQ
                </h2>
                <div className="flex flex-col">
                  {faqs.map((f, i) => (
                    <details
                      key={i}
                      className="border-hairline border-b py-4 [&_summary]:cursor-pointer [&_summary]:list-none"
                    >
                      <summary className="font-link text-ink text-[17px]">
                        {f.q}
                      </summary>
                      <p className="font-body-sm text-ink/80 mt-2 text-[15px] leading-[1.55]">
                        {f.a}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </Container>
        </section>
      )}

      {related.length > 0 && (
        <section>
          <Container className="py-8">
            <span className="mb-4 block font-mono text-[13px] tracking-[0.6px] uppercase">
              Related roadmaps
            </span>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {related.map((c) => (
                <Link
                  key={c.slug}
                  href={`/${c.slug}`}
                  className="bg-surface-soft text-ink hover:border-hairline rounded-md border border-transparent px-4 py-3 no-underline"
                >
                  <span className="font-link text-[16px]">{c.title}</span>
                  <span className="text-ink/55 mt-1 block font-mono text-[11px]">
                    {c.topicCount} topics
                  </span>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <div className="mt-16">
        <AppFooter />
      </div>
    </div>
  );
}
