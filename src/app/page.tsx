import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Container } from "@/components/layout/Container";
import {
  rolePaths,
  skillPaths,
  changelog,
  type RolePath,
  type SkillPath,
} from "@/lib/home-data";

const eyebrow = "font-mono text-[13px] uppercase tracking-[0.6px] text-ink";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <AppHeader active="roadmaps" className="sticky top-0 z-50" />

      {/* Hero */}
      <section className="border-b border-hairline">
        <Container className="flex flex-col gap-[22px] py-[52px] pt-14">
          <h1 className="m-0 max-w-[900px] text-balance text-[clamp(42px,7vw,80px)] font-display leading-[1.0] tracking-[-0.03em]">
            Learn anything. See the whole map.
          </h1>
          <p className="m-0 max-w-[620px] text-[clamp(18px,2.2vw,22px)] font-body-sm leading-[1.4] tracking-[-0.14px]">
            Visual learning paths for any tech skill — generated for you, tracked by you.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-3">
            <Link
              href="/ai"
              className="flex h-12 items-center rounded-full bg-primary px-6 text-[17px] font-link text-on-primary no-underline transition-transform active:scale-[0.98]"
            >
              Generate your roadmap
            </Link>
            <Link
              href="#roles"
              className="flex h-12 items-center rounded-full border border-hairline bg-canvas px-6 text-[17px] font-link text-ink no-underline hover:bg-surface-soft"
            >
              Browse paths
            </Link>
          </div>
        </Container>
      </section>

      {/* Role paths */}
      <section id="roles">
        <Container className="pt-14">
          <SectionHeader eyebrow="Role paths" note="Step-by-step maps to a job title" />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(288px,1fr))] gap-3.5">
            {rolePaths.map((role) => (
              <RoleCard key={role.slug} role={role} />
            ))}
          </div>
        </Container>
      </section>

      {/* Skill paths */}
      <section>
        <Container className="pt-11">
          <SectionHeader eyebrow="Skill paths" note="One technology, end to end" />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(212px,1fr))] gap-3">
            {skillPaths.map((skill) => (
              <SkillCard key={skill.slug} skill={skill} />
            ))}
          </div>
        </Container>
      </section>

      {/* Generate banner (lime color block) */}
      <section>
        <Container className="pt-14">
          <div className="flex flex-wrap items-center gap-10 rounded-lg bg-block-lime p-12">
            <div className="flex flex-[1_1_320px] flex-col gap-3.5">
              <div className={eyebrow}>Generate your own</div>
              <h2 className="m-0 max-w-[460px] text-balance text-[clamp(30px,3.6vw,44px)] font-display leading-[1.05] tracking-[-0.02em]">
                Don&apos;t see your path? Describe it.
              </h2>
              <p className="m-0 max-w-[440px] text-[18px] font-body-sm leading-[1.45] tracking-[-0.14px]">
                A goal like &ldquo;ship an iOS app&rdquo; or &ldquo;move from support to PM&rdquo; becomes a custom, trackable map in about a minute.
              </p>
            </div>
            <div className="flex flex-[1_1_320px] flex-col gap-3">
              <div className="flex items-center gap-2 rounded-full bg-canvas p-[7px] pl-5">
                <span className="flex-1 text-[17px] font-body-sm text-ink/50">I want to learn…</span>
                <Link
                  href="/ai"
                  className="flex h-[42px] shrink-0 items-center rounded-full bg-primary px-[22px] text-[16px] font-link text-on-primary no-underline transition-transform active:scale-[0.98]"
                >
                  Generate
                </Link>
              </div>
              <span className="pl-5 font-mono text-[12px] uppercase tracking-[0.6px] text-ink">
                Runs on your own AI key · no limits
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* Changelog + newsletter */}
      <section id="changelog">
        <Container className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-3.5 pt-14">
          <div className="flex flex-col gap-[18px] rounded-lg border border-hairline p-7">
            <div className="flex items-center justify-between">
              <span className={eyebrow}>Changelog</span>
              <Link href="/#changelog" className="border-b-2 border-ink text-[15px] font-link text-ink no-underline">
                All updates
              </Link>
            </div>
            <div className="flex flex-col gap-4">
              {changelog.map((entry) => (
                <div key={entry.date} className="flex items-baseline gap-4">
                  <span className="w-[52px] shrink-0 font-mono text-[11px] uppercase tracking-[0.5px] text-ink/55">
                    {entry.date}
                  </span>
                  <span className="text-[16px] font-body-sm leading-[1.4]">{entry.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center gap-3.5 rounded-lg bg-block-cream p-7">
            <span className="text-[24px] font-headline tracking-[-0.01em]">One email a month</span>
            <span className="text-[16px] font-body-sm leading-[1.45]">New paths and features. No fluff.</span>
            <form className="mt-1 flex items-center gap-2">
              <input
                type="email"
                placeholder="you@work.com"
                className="min-w-0 flex-1 rounded-full border border-hairline bg-canvas px-[18px] py-3 text-[16px] font-body-sm text-ink outline-none focus:border-ink focus:shadow-[0_0_0_1px_var(--color-ink)]"
              />
              <button
                type="submit"
                className="h-[46px] shrink-0 rounded-full bg-primary px-5 text-[16px] font-link text-on-primary transition-transform active:scale-[0.98]"
              >
                Subscribe
              </button>
            </form>
          </div>
        </Container>
      </section>

      <div className="mt-[72px]">
        <AppFooter />
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow: label, note }: { eyebrow: string; note: string }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <span className={eyebrow}>{label}</span>
      <span className="h-px flex-1 bg-hairline" />
      <span className="text-[15px] font-body-sm text-ink/65">{note}</span>
    </div>
  );
}

function NewBadge({ small = false }: { small?: boolean }) {
  return (
    <span
      className={
        small
          ? "rounded-sm bg-block-lilac px-[5px] py-0.5 font-mono text-[9px] uppercase tracking-[0.5px]"
          : "rounded-sm bg-block-lilac px-[7px] py-0.5 font-mono text-[10px] uppercase tracking-[0.6px] font-normal"
      }
    >
      New
    </span>
  );
}

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
      <path
        d="M4 2.5h8V14l-4-2.6L4 14V2.5z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RoleCard({ role }: { role: RolePath }) {
  return (
    <Link
      href={`/${role.slug}`}
      className="flex flex-col gap-3.5 rounded-md border border-transparent bg-surface-soft p-5 text-ink no-underline hover:border-hairline"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2 text-[17px] font-link text-ink">
          {role.title}
          {role.isNew && <NewBadge />}
        </span>
        <BookmarkIcon filled={role.progress !== undefined} />
      </div>
      {role.progress !== undefined ? (
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
            <div className="h-full bg-ink" style={{ width: `${role.progress}%` }} />
          </div>
          <span className="font-mono text-[11px] text-ink">{role.progress}%</span>
        </div>
      ) : (
        <span className="font-mono text-[11px] tracking-[0.4px] text-ink/60">
          {role.topics} topics
        </span>
      )}
    </Link>
  );
}

function SkillCard({ skill }: { skill: SkillPath }) {
  return (
    <Link
      href={`/${skill.slug}`}
      className="flex items-center justify-between gap-2 rounded-md border border-transparent bg-surface-soft px-4 py-[15px] text-ink no-underline hover:border-hairline"
    >
      <span className="flex items-center gap-[7px] text-[16px] font-link text-ink">
        {skill.title}
        {skill.isNew && <NewBadge small />}
      </span>
      <span className="font-mono text-[11px] text-ink/55">{skill.topics}</span>
    </Link>
  );
}
