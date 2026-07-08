"use client";

import { SessionProvider } from "next-auth/react";
import { MergeOnLogin } from "@/lib/stores/progress-sync";

/**
 * Client providers. SessionProvider fetches the session client-side so the home and
 * roadmap pages stay statically rendered (no auth() in the root layout).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MergeOnLogin />
      {children}
    </SessionProvider>
  );
}
