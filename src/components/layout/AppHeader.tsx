"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type MenuItem = {
  href: string;
  title: string;
  subtitle: string;
  tile: string; // Tailwind bg-* class for the icon tile
  icon: React.ReactNode;
};

const ICON = "h-4 w-4";

const roadmapItems: MenuItem[] = [
  {
    href: "/roadmaps",
    title: "All roadmaps",
    subtitle: "Every role and skill path",
    tile: "bg-surface-soft",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={ICON}>
        <path d="M8 2l6 3-6 3-6-3 6-3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M2 8l6 3 6-3M2 11l6 3 6-3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/get-started",
    title: "Get started",
    subtitle: "Guided picker for your goal",
    tile: "bg-block-mint",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={ICON}>
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
        <path d="M10.6 5.4l-1.5 3.7-3.7 1.5 1.5-3.7 3.7-1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/projects",
    title: "Projects",
    subtitle: "Build something to cement a path",
    tile: "bg-block-coral",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={ICON}>
        <path d="M8 2l5 2.5v5L8 12 3 9.5v-5L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M3 4.5L8 7l5-2.5M8 7v5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/guides",
    title: "Guides",
    subtitle: "Deep-dive articles per topic",
    tile: "bg-block-cream",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={ICON}>
        <path d="M3 3h3.5A1.6 1.6 0 0 1 8 4.6V13a1.4 1.4 0 0 0-1.4-1.1H3V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M13 3H9.5A1.6 1.6 0 0 0 8 4.6V13a1.4 1.4 0 0 1 1.4-1.1H13V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/best-practices",
    title: "Best practices",
    subtitle: "Checklists for the job",
    tile: "bg-surface-soft",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={ICON}>
        <path d="M6.5 4.5H13M6.5 8H13M6.5 11.5H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M2.6 4.3l1 1 1.6-1.8M2.6 7.8l1 1 1.6-1.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const aiItems: MenuItem[] = [
  {
    href: "/ai",
    title: "Create with AI",
    subtitle: "Describe a goal, get a map",
    tile: "bg-block-lilac",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={ICON}>
        <path d="M8 2l1.4 3.6L13 7l-3.6 1.4L8 12l-1.4-3.6L3 7l3.6-1.4L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/tutor",
    title: "Roadmap chat",
    subtitle: "Chat grounded in a path",
    tile: "bg-block-lilac",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={ICON}>
        <path d="M2.5 4.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H7l-3 2.4V10.5H4.5a2 2 0 0 1-2-2v-4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/tutor",
    title: "Ask the tutor",
    subtitle: "One-off questions, any topic",
    tile: "bg-surface-soft",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={ICON}>
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
        <path d="M6.4 6.2a1.6 1.6 0 1 1 2.2 1.5c-.5.3-.9.6-.9 1.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M8 11.3v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/ai",
    title: "Test my skills",
    subtitle: "Quiz yourself on a path",
    tile: "bg-block-lilac",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={ICON}>
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="8" cy="8" r="2.8" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="8" cy="8" r="0.6" fill="currentColor" />
      </svg>
    ),
  },
];

function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-[9px] text-[20px] font-headline tracking-[-0.02em] text-ink no-underline"
    >
      <svg width="22" height="22" viewBox="0 0 28 28" fill="none" className="shrink-0">
        <g opacity="0.35">
          {[3, 10, 17, 24].map((x) => (
            <circle key={`t${x}`} cx={x} cy="3" r="1" fill="currentColor" />
          ))}
          <circle cx="3" cy="10" r="1" fill="currentColor" />
          <circle cx="24" cy="10" r="1" fill="currentColor" />
          <circle cx="3" cy="17" r="1" fill="currentColor" />
          <circle cx="24" cy="17" r="1" fill="currentColor" />
          {[3, 10, 17, 24].map((x) => (
            <circle key={`b${x}`} cx={x} cy="24" r="1" fill="currentColor" />
          ))}
        </g>
        <path d="M4 24 L13 14 L24 4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="4" cy="24" r="3" fill="currentColor" />
        <circle cx="13" cy="14" r="3" fill="currentColor" />
        <circle cx="24" cy="4" r="3.5" fill="var(--color-block-lilac)" stroke="currentColor" strokeWidth="2" />
      </svg>
      pathgrid
    </Link>
  );
}

function Dropdown({
  label,
  items,
  isActive,
  isOpen,
  onOpen,
  onClose,
}: {
  label: string;
  items: MenuItem[];
  isActive: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <div className="relative" onMouseEnter={onOpen} onMouseLeave={onClose}>
      <button
        type="button"
        onFocus={onOpen}
        aria-expanded={isOpen}
        className={cn(
          "flex items-center gap-[5px] rounded-full px-3 py-1.5 text-[15px] text-ink transition-colors",
          isOpen ? "bg-surface-soft" : "bg-transparent",
          isActive || isOpen ? "font-link" : "font-body-sm",
        )}
      >
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={cn("transition-transform", isOpen && "rotate-180")}
        >
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-[60] flex w-[344px] flex-col rounded-xl border border-hairline bg-canvas p-1.5 shadow-soft">
          {items.map((item, i) => (
            <Link
              key={`${item.title}-${i}`}
              href={item.href}
              className="flex items-center gap-3 rounded-lg p-[10px_12px] no-underline hover:bg-surface-soft"
            >
              <span
                className={cn(
                  "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border-[1.5px] border-ink text-ink",
                  item.tile,
                )}
              >
                {item.icon}
              </span>
              <span className="flex flex-col gap-px">
                <span className="text-[15px] font-link text-ink">{item.title}</span>
                <span className="text-[13px] font-body-sm text-ink/65">{item.subtitle}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppHeader({
  signedIn = false,
  active,
  className,
}: {
  signedIn?: boolean;
  active?: "roadmaps" | "ai";
  className?: string;
}) {
  const [open, setOpen] = useState<"roadmaps" | "ai" | "avatar" | null>(null);

  return (
    <header
      className={cn(
        "relative z-[2] border-b border-hairline bg-canvas text-ink",
        className,
      )}
    >
      <div className="mx-auto flex h-[60px] max-w-[1440px] items-center justify-between gap-6 px-8">
        <div className="flex items-center gap-[26px]">
          <Brand />
          <nav className="flex items-center gap-0.5">
            <Dropdown
              label="Roadmaps"
              items={roadmapItems}
              isActive={active === "roadmaps"}
              isOpen={open === "roadmaps"}
              onOpen={() => setOpen("roadmaps")}
              onClose={() => setOpen(null)}
            />
            <Dropdown
              label="AI Tutor"
              items={aiItems}
              isActive={active === "ai"}
              isOpen={open === "ai"}
              onOpen={() => setOpen("ai")}
              onClose={() => setOpen(null)}
            />
          </nav>
        </div>

        {signedIn ? (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              title="Search"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-canvas hover:bg-surface-soft"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4.2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.2 10.2L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <div
              className="relative"
              onMouseEnter={() => setOpen("avatar")}
              onMouseLeave={() => setOpen(null)}
            >
              <button
                type="button"
                title="Account"
                onFocus={() => setOpen("avatar")}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border border-hairline font-mono text-[13px] text-ink",
                  open === "avatar" ? "bg-hairline" : "bg-surface-soft",
                )}
              >
                MK
              </button>
              {open === "avatar" && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-[60] flex w-56 flex-col rounded-xl border border-hairline bg-canvas p-1.5 shadow-soft">
                  <div className="flex flex-col gap-0.5 px-3 pb-2.5 pt-2">
                    <span className="text-[15px] font-headline tracking-[-0.01em]">Mia Kern</span>
                    <span className="font-mono text-[11px] text-ink/60">mia@work.com</span>
                  </div>
                  <span className="mx-0 my-1 h-px bg-hairline" />
                  <AvatarLink href="/dashboard" label="Dashboard" />
                  <AvatarLink href="/dashboard" label="My learning" />
                  <AvatarLink href="/settings" label="Settings" />
                  <span className="mx-0 my-1 h-px bg-hairline" />
                  <AvatarLink href="/login" label="Log out" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full px-3 py-2 text-[15px] font-link text-ink no-underline hover:bg-surface-soft"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="flex h-10 items-center rounded-full bg-primary px-5 text-[15px] font-link text-on-primary no-underline transition-transform active:scale-[0.98]"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

function AvatarLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-[9px] text-[15px] font-body-sm text-ink no-underline hover:bg-surface-soft"
    >
      {label}
    </Link>
  );
}
