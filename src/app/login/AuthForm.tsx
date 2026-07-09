"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

const oauthBtn =
  "flex h-12 items-center justify-center gap-2.5 rounded-full border border-hairline bg-canvas font-link text-[16px] text-ink no-underline transition-transform hover:bg-surface-soft active:scale-[0.98]";

export function AuthForm({
  initialMode,
  callbackUrl = "/dashboard",
}: {
  initialMode: "signin" | "signup";
  /** Sanitized by the login page — relative paths only. */
  callbackUrl?: string;
}) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const signup = mode === "signup";

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setLoading(true);
    const res = await signIn("resend", {
      email,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (!res?.error) setSent(true);
  }

  return (
    <div className="flex w-full max-w-[392px] flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <span className="text-ink/70 font-mono text-[12px] tracking-[0.6px] uppercase">
          {signup ? "Get started free" : "Welcome back"}
        </span>
        <h1 className="font-headline text-[32px] leading-[1.15] tracking-[-0.4px]">
          {signup ? "Create your account" : "Sign in to pathgrid"}
        </h1>
        <p className="font-body-sm text-ink/75 text-[16px] leading-[1.45]">
          {signup
            ? "Bring your own AI key — pathgrid itself is free and yours to keep."
            : "Pick up where you left off — maps, progress and tutor threads."}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => signIn("github", { callbackUrl })}
          className={oauthBtn}
        >
          <svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Continue with GitHub
        </button>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className={oauthBtn}
        >
          <svg width="17" height="17" viewBox="0 0 18 18">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.98 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"
            />
          </svg>
          Continue with Google
        </button>
      </div>

      <div className="flex items-center gap-3.5">
        <span className="bg-hairline h-px flex-1" />
        <span className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase">
          or
        </span>
        <span className="bg-hairline h-px flex-1" />
      </div>

      {sent ? (
        <div className="bg-block-mint flex items-center gap-2.5 rounded-md px-3.5 py-3">
          <svg width="15" height="15" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6.4L4.7 9 10 3.4"
              stroke="var(--color-success)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-body-sm text-[15px]">
            Check {email} — we sent a one-time link.
          </span>
        </div>
      ) : (
        <form onSubmit={submitEmail} className="flex flex-col gap-2.5">
          <label htmlFor="email" className="font-body-sm text-[16px]">
            Work or personal email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@work.com"
            className="border-hairline bg-canvas font-body text-ink focus:border-ink w-full rounded-md border px-3.5 py-3 text-[18px] outline-none focus:shadow-[0_0_0_1px_var(--color-ink)]"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary font-link text-on-primary h-12 rounded-full text-[16px] transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {loading
              ? "Sending…"
              : signup
                ? "Email me a sign-up link"
                : "Email me a sign-in link"}
          </button>
          <span className="text-ink/60 text-center font-mono text-[13px]">
            No password — we email a one-time link.
          </span>
        </form>
      )}

      <div className="border-hairline flex flex-col gap-2.5 border-t pt-[18px]">
        <span className="text-ink/65 font-mono text-[11px] tracking-[0.65px] uppercase">
          {signup ? "Already have an account?" : "New here?"}
        </span>
        <button
          type="button"
          onClick={() => {
            setMode(signup ? "signin" : "signup");
            setSent(false);
          }}
          className="border-ink font-link text-ink w-fit border-b-2 text-[16px]"
        >
          {signup ? "Sign in instead" : "Create an account"}
        </button>
        <p className="font-body-sm text-ink/60 text-[13px] leading-[1.5]">
          By continuing you agree to the{" "}
          <Link href="/terms" className="text-ink underline">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-ink underline">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
