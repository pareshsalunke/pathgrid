"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "./Container";

const productLinks = [
  { href: "/roadmaps", label: "Roadmaps" },
  { href: "/guides", label: "Guides" },
  { href: "/ai", label: "AI tutor" },
  { href: "/#changelog", label: "Changelog" },
];

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/impressum", label: "Impressum" },
];

const eyebrow = "font-mono text-[12px] uppercase tracking-[0.6px] text-ink/55";
const footLink = "text-[15px] font-body-sm text-ink no-underline hover:underline";

export function AppFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <footer className="border-t border-hairline bg-canvas text-ink">
      <Container className="flex flex-wrap justify-between gap-14 px-8 pb-8 pt-14">
        {/* Brand + social */}
        <div className="flex max-w-[300px] flex-col gap-4">
          <span className="flex items-center gap-2.5 text-[22px] font-headline tracking-[-0.02em]">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none" className="shrink-0">
              <path d="M4 24 L13 14 L24 4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="4" cy="24" r="3" fill="currentColor" />
              <circle cx="13" cy="14" r="3" fill="currentColor" />
              <circle cx="24" cy="4" r="3.5" fill="var(--color-block-lilac)" stroke="currentColor" strokeWidth="2" />
            </svg>
            pathgrid
          </span>
          <span className="text-[15px] font-body-sm leading-[1.55] text-ink/70">
            Visual learning paths for any tech skill. Your progress stays on this device unless you sign in.
          </span>
          <div className="mt-0.5 flex gap-2">
            <SocialLink title="GitHub">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </SocialLink>
            <SocialLink title="X">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12.6 1.5h2.3l-5 5.7 5.9 7.8h-4.6l-3.6-4.7-4.1 4.7H1.1l5.4-6.1L0.8 1.5h4.7l3.3 4.3 3.8-4.3zm-.8 12.1h1.3L4.9 2.8H3.5l8.3 10.8z" />
              </svg>
            </SocialLink>
            <SocialLink title="LinkedIn">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.4 1.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2zM1.9 5.8h3V14.6h-3V5.8zm4.8 0h2.9v1.2h.04c.4-.76 1.4-1.56 2.86-1.56 3.06 0 3.63 2 3.63 4.65v5.1h-3V10.7c0-1.1-.02-2.5-1.54-2.5-1.54 0-1.78 1.2-1.78 2.43v4.97h-3V5.8z" />
              </svg>
            </SocialLink>
          </div>
        </div>

        {/* Link columns + newsletter */}
        <div className="flex flex-wrap gap-14">
          <div className="flex flex-col gap-[13px]">
            <span className={eyebrow}>Product</span>
            {productLinks.map((l) => (
              <Link key={l.label} href={l.href} className={footLink}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-[13px]">
            <span className={eyebrow}>Company</span>
            {companyLinks.map((l) => (
              <Link key={l.label} href={l.href} className={footLink}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex w-[280px] flex-col gap-3">
            <span className={eyebrow}>One email a month</span>
            <span className="text-[15px] font-body-sm leading-[1.45] text-ink/70">
              New paths and features. No fluff.
            </span>
            {subscribed ? (
              <div className="flex items-center gap-2.5 rounded-full bg-block-mint px-4 py-[11px]">
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6.4L4.7 9 10 3.4" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[14px] font-body-sm">You&apos;re on the list.</span>
              </div>
            ) : (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email.includes("@")) setSubscribed(true);
                }}
              >
                <input
                  type="email"
                  placeholder="you@work.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-w-0 flex-1 rounded-full border border-hairline bg-canvas px-4 py-[11px] text-[15px] font-body-sm text-ink outline-none focus:border-ink focus:shadow-[0_0_0_1px_var(--color-ink)]"
                />
                <button
                  type="submit"
                  className="h-11 shrink-0 rounded-full bg-primary px-[18px] text-[15px] font-link text-on-primary transition-transform active:scale-[0.98]"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>
      </Container>

      <div className="border-t border-hairline">
        <Container className="flex flex-wrap items-center justify-between gap-4 px-8 py-[18px]">
          <span className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink/55">
            © 2026 pathgrid
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink/55">
            Path content: AI-drafted · human-reviewed
          </span>
        </Container>
      </div>
    </footer>
  );
}

function SocialLink({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <a
      href="#"
      title={title}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-ink no-underline hover:bg-surface-soft"
    >
      {children}
    </a>
  );
}
