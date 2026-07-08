import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Container } from "@/components/layout/Container";
import { getUserProgressSummary } from "@/lib/db/progress";
import { getBookmarkCards } from "@/lib/db/bookmarks";

export const metadata: Metadata = { title: "Dashboard" };

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <span className="text-ink font-mono text-[13px] tracking-[0.6px] uppercase">
        {label}
      </span>
      <span className="bg-hairline h-px flex-1" />
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [learning, bookmarks] = await Promise.all([
    getUserProgressSummary(session.user.id),
    getBookmarkCards(session.user.id),
  ]);
  const firstName = session.user.name?.split(" ")[0] ?? "back";

  return (
    <div className="bg-canvas text-ink flex min-h-screen flex-col">
      <AppHeader className="sticky top-0 z-50" />
      <Container className="flex-1 pt-11 pb-20">
        <div className="mb-11 flex flex-col gap-2">
          <span className="text-ink/60 font-mono text-[13px] tracking-[0.6px] uppercase">
            Your learning
          </span>
          <h1 className="font-display text-[clamp(30px,5vw,40px)] leading-[1.0] tracking-[-0.02em]">
            Welcome back, {firstName}.
          </h1>
        </div>

        {/* Continue learning */}
        <section className="mb-11">
          <SectionHeader label="Continue learning" />
          {learning.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-3.5">
              {learning.map((r) => (
                <div
                  key={r.slug}
                  className="border-ink flex flex-col gap-4 rounded-lg border-2 p-[22px]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-headline text-[19px] tracking-[-0.2px]">
                      {r.title}
                    </span>
                    <Link
                      href={`/${r.slug}`}
                      className="bg-primary font-link text-on-primary shrink-0 rounded-full px-[18px] py-2 text-[14px] no-underline"
                    >
                      Resume
                    </Link>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="bg-hairline h-2 flex-1 overflow-hidden rounded-full">
                      <div
                        className="bg-ink h-full"
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                    <span className="text-ink/70 font-mono text-[11px]">
                      {r.doneCount} of {r.topicCount} · {r.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              text="Nothing in progress yet."
              cta="Browse roadmaps"
              href="/"
            />
          )}
        </section>

        {/* Bookmarks */}
        <section className="mb-11">
          <SectionHeader label="Bookmarks" />
          {bookmarks.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
              {bookmarks.map((b) => (
                <Link
                  key={b.slug}
                  href={`/${b.slug}`}
                  className="bg-surface-soft text-ink hover:border-hairline flex flex-col gap-3 rounded-md border border-transparent p-5 no-underline"
                >
                  <span className="font-link text-[17px]">{b.title}</span>
                  <span className="text-ink/60 font-mono text-[10px] tracking-[0.5px] uppercase">
                    {b.category} path · {b.topicCount} topics
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState text="No bookmarks yet." cta="Find a path" href="/" />
          )}
        </section>

        {/* AI library (Phase 3) */}
        <section>
          <SectionHeader label="AI library" />
          <div className="border-hairline flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-11 text-center">
            <span className="font-link text-[18px]">Nothing generated yet</span>
            <span className="font-body-sm text-ink/75 max-w-[360px] text-[15px]">
              Describe a goal and the AI drafts a map you can keep.
            </span>
            <Link
              href="/ai"
              className="bg-primary font-link text-on-primary mt-1 rounded-full px-[18px] py-2.5 text-[15px] no-underline"
            >
              Generate roadmap
            </Link>
          </div>
        </section>
      </Container>
      <AppFooter />
    </div>
  );
}

function EmptyState({
  text,
  cta,
  href,
}: {
  text: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="border-hairline flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-6 py-8">
      <span className="font-body-sm text-ink/70 text-[15px]">{text}</span>
      <Link
        href={href}
        className="border-hairline bg-canvas font-link text-ink hover:bg-surface-soft rounded-full border px-4 py-2 text-[14px] no-underline"
      >
        {cta}
      </Link>
    </div>
  );
}
