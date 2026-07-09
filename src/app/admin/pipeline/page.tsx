import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { listDraftRoadmaps } from "@/lib/db/pipeline";
import { critiqueSchema, type Critique } from "@/lib/pipeline/prompts";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

/**
 * /admin/pipeline — the human review gate (doc 06 §2 step 8, §4.3; docs/08 Phase 4).
 * Lists unlisted pipeline drafts with their critique-pass findings and the fixed
 * review checklist; the draft itself is reviewed on the real /[slug] page (drafts are
 * unlisted, so that page renders on demand — DECISIONS.md). Same admin gate as
 * /admin/ai: allowlist or 404. Critique files are read best-effort from
 * pipeline/out/ — present locally where the pipeline ran, absent on Vercel.
 */
export const metadata: Metadata = {
  title: "Pipeline review",
  robots: { index: false, follow: false },
};

// Doc 06 §4.3 — the fixed 10-minute review checklist.
const CHECKLIST = [
  "Order sane? (stages build on each other, no forward references)",
  "Optional flags sensible?",
  "No invented tools/versions?",
  "Tone consistent (direct, no hype)?",
  "Resources load?",
] as const;

async function readCritique(slug: string): Promise<Critique | null> {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "pipeline", "out", slug, "critique.json"),
      "utf8",
    );
    const parsed = critiqueSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null; // no local pipeline output (e.g. deployed) — fine
  }
}

const SEVERITY_CLASS: Record<string, string> = {
  high: "text-block-coral",
  medium: "text-ink",
  low: "text-ink/60",
};

export default async function AdminPipelinePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/pipeline");
  // 404 rather than redirect — don't reveal the page exists to non-admins.
  if (!isAdmin(session.user.email)) notFound();

  const drafts = await listDraftRoadmaps();
  const critiques = await Promise.all(drafts.map((d) => readCritique(d.slug)));

  return (
    <div className="bg-canvas text-ink flex min-h-screen flex-col">
      <AppHeader className="sticky top-0 z-50" />
      <div className="mx-auto w-full max-w-[900px] flex-1 px-8 pt-11 pb-20">
        <div className="mb-10 flex flex-col gap-2">
          <span className="text-ink/60 font-mono text-[13px] tracking-[0.6px] uppercase">
            Admin
          </span>
          <h1 className="font-display text-[clamp(30px,5vw,40px)] leading-[1.0] tracking-[-0.02em]">
            Pipeline review
          </h1>
          <p className="font-body-sm text-ink/70 text-[15px]">
            Unlisted drafts awaiting sign-off. Review each on its real page,
            work the checklist, then publish from the CLI.
          </p>
        </div>

        <section className="mb-10">
          <SectionHeader label="Review checklist (doc 06 §4.3)" />
          <ul className="border-hairline flex flex-col gap-2 rounded-lg border p-[22px]">
            {CHECKLIST.map((item) => (
              <li key={item} className="font-body-sm text-ink text-[15px]">
                · {item}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHeader label={`Drafts (${drafts.length})`} />
          {drafts.length === 0 ? (
            <p className="border-hairline text-ink/60 font-body-sm rounded-lg border p-[22px] text-[15px]">
              No drafts awaiting review. Run{" "}
              <code className="font-mono text-[13px]">
                pnpm pipeline all --slug=&lt;slug&gt;
              </code>{" "}
              to seed one.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {drafts.map((d, i) => {
                const critique = critiques[i];
                return (
                  <article
                    key={d.slug}
                    className="border-hairline flex flex-col gap-3 rounded-lg border p-[22px]"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/${d.slug}`}
                          className="font-headline text-ink text-[19px] tracking-[-0.2px] no-underline hover:underline"
                        >
                          {d.title}
                        </Link>
                        <span className="text-ink/60 font-mono text-[12px]">
                          /{d.slug} · {d.category} · updated{" "}
                          {d.updatedAt.toISOString().slice(0, 10)}
                        </span>
                      </div>
                      <code className="bg-surface-soft rounded px-2 py-1 font-mono text-[12px]">
                        pnpm pipeline publish --slug={d.slug}
                      </code>
                    </div>

                    {critique === null ? (
                      <p className="font-body-sm text-ink/60 text-[14px]">
                        No local critique output (run{" "}
                        <code className="font-mono text-[12px]">
                          pnpm pipeline critique --slug={d.slug}
                        </code>{" "}
                        on the machine that seeded it).
                      </p>
                    ) : critique.findings.length === 0 ? (
                      <p className="font-body-sm text-success text-[14px]">
                        Critique pass found no problems.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {critique.findings.map((f, j) => (
                          <li
                            key={j}
                            className="font-body-sm text-[14px] leading-[1.5]"
                          >
                            <span
                              className={`font-mono text-[11px] uppercase ${SEVERITY_CLASS[f.severity]}`}
                            >
                              {f.severity}
                            </span>{" "}
                            <span className="text-ink/70">[{f.area}]</span>{" "}
                            {f.note}
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <AppFooter />
    </div>
  );
}

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
