"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True only after hydration on the client; false during SSR and the first client
 * render. Gate localStorage-derived UI on this to avoid hydration mismatches.
 * Uses useSyncExternalStore (server snapshot = false, client snapshot = true) so
 * there is no setState-in-effect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
