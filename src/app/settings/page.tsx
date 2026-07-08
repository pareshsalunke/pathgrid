import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { AccountActions } from "./AccountActions";

export const metadata: Metadata = { title: "Settings" };

function initialsFrom(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (letters || source.slice(0, 2) || "?").toUpperCase();
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

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = session.user;

  return (
    <div className="bg-canvas text-ink flex min-h-screen flex-col">
      <AppHeader className="sticky top-0 z-50" />
      <div className="mx-auto w-full max-w-[760px] flex-1 px-8 pt-11 pb-20">
        <div className="mb-10 flex flex-col gap-2">
          <span className="text-ink/60 font-mono text-[13px] tracking-[0.6px] uppercase">
            Settings
          </span>
          <h1 className="font-display text-[clamp(30px,5vw,40px)] leading-[1.0] tracking-[-0.02em]">
            Your account
          </h1>
        </div>

        <section className="mb-10">
          <SectionHeader label="Profile" />
          <div className="border-hairline flex flex-wrap items-center gap-[18px] rounded-lg border p-[22px]">
            <span className="border-ink bg-block-lilac text-ink flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 font-mono text-[18px]">
              {initialsFrom(user.name, user.email)}
            </span>
            <div className="flex min-w-[200px] flex-1 flex-col gap-1">
              <span className="font-headline text-[19px] tracking-[-0.2px]">
                {user.name ?? "Your name"}
              </span>
              <span className="font-body-sm text-ink/70 text-[15px]">
                {user.email}
              </span>
            </div>
          </div>
        </section>

        <section>
          <SectionHeader label="Account" />
          <div className="border-hairline rounded-lg border p-[22px]">
            <AccountActions />
          </div>
        </section>

        <p className="text-ink/45 mt-8 font-mono text-[11px] tracking-[0.5px] uppercase">
          AI provider &amp; API keys — coming in the AI phase
        </p>
      </div>
      <AppFooter />
    </div>
  );
}
