import type { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { getAiUsageByDay } from "@/lib/db/admin";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

/**
 * /admin/ai — operator usage table (docs/08 Phase 3 item 7): tokens/day per feature
 * from the `ai_call` events log. Gated by an env email allowlist (docs/05 §4 has no
 * server-side metering — this is a self-host operator view, not user-facing). Dynamic
 * via auth(); noindex. BYOK keys never reach the events log, so none can surface here.
 */
export const metadata: Metadata = {
  title: "AI usage",
  robots: { index: false, follow: false },
};

const WINDOW_DAYS = 30;
const fmt = (n: number) => n.toLocaleString("en-US");

export default async function AdminAiPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/ai");
  // 404 rather than redirect — don't reveal the page exists to non-admins.
  if (!isAdmin(session.user.email)) notFound();

  const rows = await getAiUsageByDay(WINDOW_DAYS);
  const totals = rows.reduce(
    (a, r) => ({
      calls: a.calls + r.calls,
      failures: a.failures + r.failures,
      inTokens: a.inTokens + r.inTokens,
      outTokens: a.outTokens + r.outTokens,
    }),
    { calls: 0, failures: 0, inTokens: 0, outTokens: 0 },
  );

  return (
    <div className="bg-canvas text-ink flex min-h-screen flex-col">
      <AppHeader className="sticky top-0 z-50" />
      <div className="mx-auto w-full max-w-[900px] flex-1 px-8 pt-11 pb-20">
        <div className="mb-10 flex flex-col gap-2">
          <span className="text-ink/60 font-mono text-[13px] tracking-[0.6px] uppercase">
            Admin
          </span>
          <h1 className="font-display text-[clamp(30px,5vw,40px)] leading-[1.0] tracking-[-0.02em]">
            AI usage
          </h1>
          <p className="font-body-sm text-ink/70 text-[15px]">
            Token spend per feature from the events log — last {WINDOW_DAYS}{" "}
            days (UTC). Users pay their own provider; BYOK keys never appear
            here.
          </p>
        </div>

        <section className="mb-10">
          <SectionHeader label={`Last ${WINDOW_DAYS} days`} />
          <div className="bg-hairline border-hairline grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-4">
            <Stat label="Calls" value={fmt(totals.calls)} />
            <Stat
              label="Failures"
              value={fmt(totals.failures)}
              coral={totals.failures > 0}
            />
            <Stat label="In tokens" value={fmt(totals.inTokens)} />
            <Stat label="Out tokens" value={fmt(totals.outTokens)} />
          </div>
        </section>

        <section>
          <SectionHeader label="By day + feature" />
          {rows.length === 0 ? (
            <p className="border-hairline text-ink/60 font-body-sm rounded-lg border p-[22px] text-[15px]">
              No AI calls logged yet.
            </p>
          ) : (
            <div className="border-hairline overflow-x-auto rounded-lg border">
              <table className="w-full border-collapse text-[14px]">
                <thead>
                  <tr>
                    <Th>Day</Th>
                    <Th>Feature</Th>
                    <Th align="right">Calls</Th>
                    <Th align="right">Failures</Th>
                    <Th align="right">In tokens</Th>
                    <Th align="right">Out tokens</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const newDay = i === 0 || rows[i - 1].day !== r.day;
                    return (
                      <tr
                        key={`${r.day}:${r.feature}`}
                        className={newDay ? "border-hairline border-t" : ""}
                      >
                        <td className="text-ink/70 px-4 py-2 align-top font-mono tabular-nums">
                          {newDay ? r.day : ""}
                        </td>
                        <td className="px-4 py-2">{r.feature}</td>
                        <Num>{fmt(r.calls)}</Num>
                        <td
                          className={`px-4 py-2 text-right font-mono tabular-nums ${
                            r.failures > 0 ? "text-block-coral" : "text-ink/40"
                          }`}
                        >
                          {fmt(r.failures)}
                        </td>
                        <Num>{fmt(r.inTokens)}</Num>
                        <Num>{fmt(r.outTokens)}</Num>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

function Stat({
  label,
  value,
  coral,
}: {
  label: string;
  value: string;
  coral?: boolean;
}) {
  return (
    <div className="bg-canvas flex flex-col gap-1 p-[18px]">
      <span className="text-ink/60 font-mono text-[12px] tracking-[0.5px] uppercase">
        {label}
      </span>
      <span
        className={`font-headline text-[22px] tabular-nums ${coral ? "text-block-coral" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function Th({ children, align }: { children: ReactNode; align?: "right" }) {
  return (
    <th
      className={`text-ink/60 border-hairline border-b px-4 py-3 font-mono text-[12px] font-normal tracking-[0.5px] uppercase ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Num({ children }: { children: ReactNode }) {
  return (
    <td className="px-4 py-2 text-right font-mono tabular-nums">{children}</td>
  );
}
