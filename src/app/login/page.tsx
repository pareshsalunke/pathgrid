import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "./AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const initialMode = mode === "signup" ? "signup" : "signin";

  return (
    <div className="flex min-h-screen flex-wrap">
      {/* Hero */}
      <div className="bg-block-lilac flex flex-[1_1_440px] flex-col justify-between gap-12 p-10 sm:p-12">
        <Link
          href="/"
          className="font-headline text-ink flex items-center gap-2.5 text-[22px] tracking-[-0.02em] no-underline"
        >
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <path
              d="M4 24 L13 14 L24 4"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="4" cy="24" r="3" fill="currentColor" />
            <circle cx="13" cy="14" r="3" fill="currentColor" />
            <circle
              cx="24"
              cy="4"
              r="3.5"
              fill="var(--color-canvas)"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          pathgrid
        </Link>
        <div className="flex max-w-[440px] flex-col gap-6">
          <span className="font-mono text-[13px] tracking-[0.6px] uppercase">
            Visual learning paths
          </span>
          <h2 className="font-display text-[clamp(40px,6vw,64px)] leading-[1.0] tracking-[-0.96px] text-balance">
            Learn anything. See the whole map.
          </h2>
          <p className="font-body-sm text-[20px] leading-[1.4] tracking-[-0.14px]">
            One account keeps your maps, progress and tutor threads together —
            generated for you, tracked by you.
          </p>
          <div className="flex items-start gap-2.5">
            <span className="border-ink bg-canvas mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px]">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6.4L4.7 9 10 3.4"
                  stroke="var(--color-ink)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="font-body-sm text-[16px] leading-[1.45]">
              Your progress on this device is kept and merged into your account.
            </span>
          </div>
        </div>
        <span />
      </div>

      {/* Form */}
      <div className="bg-canvas flex flex-[1_1_480px] items-center justify-center p-12">
        <AuthForm initialMode={initialMode} />
      </div>
    </div>
  );
}
