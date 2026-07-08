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
    <div className="bg-canvas text-ink flex min-h-screen flex-col">
      <AppHeader active="roadmaps" className="sticky top-0 z-50" />

      {/* Hero */}
      <section className="border-hairline border-b">
        <Container className="flex flex-col gap-[22px] py-[52px] pt-14">
          <h1 className="font-display m-0 max-w-[900px] text-[clamp(42px,7vw,80px)] leading-[1.0] tracking-[-0.03em] text-balance">
            Learn anything. See the whole map.
          </h1>
          <p className="font-body-sm m-0 max-w-[620px] text-[clamp(18px,2.2vw,22px)] leading-[1.4] tracking-[-0.14px]">
            Visual learning paths for any tech skill — generated for you,
            tracked by you.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-3">
            <Link
              href="/ai"
              className="bg-primary font-link text-on-primary flex h-12 items-center rounded-full px-6 text-[17px] no-underline transition-transform active:scale-[0.98]"
            >
              Generate your roadmap
            </Link>
            <Link
              href="#roles"
              className="border-hairline bg-canvas font-link text-ink hover:bg-surface-soft flex h-12 items-center rounded-full border px-6 text-[17px] no-underline"
            >
              Browse paths
            </Link>
          </div>
        </Container>
      </section>

      {/* Role paths */}
      <section id="roles">
        <Container className="pt-14">
          <SectionHeader
            eyebrow="Role paths"
            note="Step-by-step maps to a job title"
          />
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
          <SectionHeader
            eyebrow="Skill paths"
            note="One technology, end to end"
          />
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
          <div className="bg-block-lime flex flex-wrap items-center gap-10 rounded-lg p-12">
            <div className="flex flex-[1_1_320px] flex-col gap-3.5">
              <div className={eyebrow}>Generate your own</div>
              <h2 className="font-display m-0 max-w-[460px] text-[clamp(30px,3.6vw,44px)] leading-[1.05] tracking-[-0.02em] text-balance">
                Don&apos;t see your path? Describe it.
              </h2>
              <p className="font-body-sm m-0 max-w-[440px] text-[18px] leading-[1.45] tracking-[-0.14px]">
                A goal like &ldquo;ship an iOS app&rdquo; or &ldquo;move from
                support to PM&rdquo; becomes a custom, trackable map in about a
                minute.
              </p>
            </div>
            <div className="flex flex-[1_1_320px] flex-col gap-3">
              <div className="bg-canvas flex items-center gap-2 rounded-full p-[7px] pl-5">
                <span className="font-body-sm text-ink/50 flex-1 text-[17px]">
                  I want to learn…
                </span>
                <Link
                  href="/ai"
                  className="bg-primary font-link text-on-primary flex h-[42px] shrink-0 items-center rounded-full px-[22px] text-[16px] no-underline transition-transform active:scale-[0.98]"
                >
                  Generate
                </Link>
              </div>
              <span className="text-ink pl-5 font-mono text-[12px] tracking-[0.6px] uppercase">
                Runs on your own AI key · no limits
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* Changelog + newsletter */}
      <section id="changelog">
        <Container className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-3.5 pt-14">
          <div className="border-hairline flex flex-col gap-[18px] rounded-lg border p-7">
            <div className="flex items-center justify-between">
              <span className={eyebrow}>Changelog</span>
              <Link
                href="/#changelog"
                className="border-ink font-link text-ink border-b-2 text-[15px] no-underline"
              >
                All updates
              </Link>
            </div>
            <div className="flex flex-col gap-4">
              {changelog.map((entry) => (
                <div key={entry.date} className="flex items-baseline gap-4">
                  <span className="text-ink/55 w-[52px] shrink-0 font-mono text-[11px] tracking-[0.5px] uppercase">
                    {entry.date}
                  </span>
                  <span className="font-body-sm text-[16px] leading-[1.4]">
                    {entry.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-block-cream flex flex-col justify-center gap-3.5 rounded-lg p-7">
            <span className="font-headline text-[24px] tracking-[-0.01em]">
              One email a month
            </span>
            <span className="font-body-sm text-[16px] leading-[1.45]">
              New paths and features. No fluff.
            </span>
            <form className="mt-1 flex items-center gap-2">
              <input
                type="email"
                placeholder="you@work.com"
                className="border-hairline bg-canvas font-body-sm text-ink focus:border-ink min-w-0 flex-1 rounded-full border px-[18px] py-3 text-[16px] outline-none focus:shadow-[0_0_0_1px_var(--color-ink)]"
              />
              <button
                type="submit"
                className="bg-primary font-link text-on-primary h-[46px] shrink-0 rounded-full px-5 text-[16px] transition-transform active:scale-[0.98]"
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

function SectionHeader({
  eyebrow: label,
  note,
}: {
  eyebrow: string;
  note: string;
}) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <span className={eyebrow}>{label}</span>
      <span className="bg-hairline h-px flex-1" />
      <span className="font-body-sm text-ink/65 text-[15px]">{note}</span>
    </div>
  );
}

function NewBadge({ small = false }: { small?: boolean }) {
  return (
    <span
      className={
        small
          ? "bg-block-lilac rounded-sm px-[5px] py-0.5 font-mono text-[9px] tracking-[0.5px] uppercase"
          : "bg-block-lilac rounded-sm px-[7px] py-0.5 font-mono text-[10px] font-normal tracking-[0.6px] uppercase"
      }
    >
      New
    </span>
  );
}

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="mt-0.5 shrink-0"
    >
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
      className="bg-surface-soft text-ink hover:border-hairline flex flex-col gap-3.5 rounded-md border border-transparent p-5 no-underline"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-link text-ink flex items-center gap-2 text-[17px]">
          {role.title}
          {role.isNew && <NewBadge />}
        </span>
        <BookmarkIcon filled={role.progress !== undefined} />
      </div>
      {role.progress !== undefined ? (
        <div className="flex items-center gap-2.5">
          <div className="bg-hairline h-1.5 flex-1 overflow-hidden rounded-full">
            <div
              className="bg-ink h-full"
              style={{ width: `${role.progress}%` }}
            />
          </div>
          <span className="text-ink font-mono text-[11px]">
            {role.progress}%
          </span>
        </div>
      ) : (
        <span className="text-ink/60 font-mono text-[11px] tracking-[0.4px]">
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
      className="bg-surface-soft text-ink hover:border-hairline flex items-center justify-between gap-2 rounded-md border border-transparent px-4 py-[15px] no-underline"
    >
      <span className="font-link text-ink flex items-center gap-[7px] text-[16px]">
        {skill.title}
        {skill.isNew && <NewBadge small />}
      </span>
      <span className="text-ink/55 font-mono text-[11px]">{skill.topics}</span>
    </Link>
  );
}
