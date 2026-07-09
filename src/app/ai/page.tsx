import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { AiHub } from "./AiHub";

/**
 * AI hub shell (docs/03 §3.3). Static RSC — deliberately no auth() so the shell
 * stays static (Phase-2 pattern); session + BYOK state resolve client-side and
 * gate the actions, not the page. Suspense wraps the hub for useSearchParams.
 */

export const metadata: Metadata = { title: "AI hub" };

export default function AiHubPage() {
  return (
    <div className="bg-canvas text-ink flex min-h-screen flex-col">
      <AppHeader className="sticky top-0 z-50" />
      <Suspense fallback={null}>
        <AiHub />
      </Suspense>
      <AppFooter />
    </div>
  );
}
