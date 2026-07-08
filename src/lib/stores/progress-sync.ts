"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useProgress } from "./progress";
import type { ProgressStatus } from "@/lib/schemas/progress";

const MERGED_KEY = "pathgrid-progress-merged";

/**
 * Once after login, fold anonymous localStorage progress into the account so nothing
 * is lost when an anon user signs in. Rendered inside SessionProvider (providers.tsx).
 */
export function MergeOnLogin() {
  const { status } = useSession();
  const doneRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || doneRef.current) return;
    doneRef.current = true;
    if (localStorage.getItem(MERGED_KEY)) return;

    const byRoadmap = useProgress.getState().byRoadmap;
    const hasData = Object.values(byRoadmap).some(
      (m) => Object.keys(m).length > 0,
    );
    const markMerged = () => localStorage.setItem(MERGED_KEY, "1");
    if (!hasData) {
      markMerged();
      return;
    }
    fetch("/api/progress/merge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ byRoadmap }),
    })
      .then((r) => {
        if (r.ok) markMerged();
      })
      .catch(() => {});
  }, [status]);

  return null;
}

/**
 * Server sync for one roadmap: hydrate from /api/progress on mount (authed), then
 * write local changes back as a debounced 500ms batch (optimistic — the store already
 * updated the UI). Anonymous users are untouched (localStorage only).
 */
export function useProgressSync(roadmapId: string) {
  const { status } = useSession();
  const authed = status === "authenticated";

  // Hydrate from the server.
  useEffect(() => {
    if (!authed) return;
    let active = true;
    fetch(`/api/progress/${roadmapId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { statuses?: Record<string, ProgressStatus> } | null) => {
        if (!active || !data?.statuses) return;
        useProgress.setState((s) => ({
          byRoadmap: {
            ...s.byRoadmap,
            [roadmapId]: {
              ...(s.byRoadmap[roadmapId] ?? {}),
              ...data.statuses,
            },
          },
        }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [authed, roadmapId]);

  // Debounced batched write-back.
  useEffect(() => {
    if (!authed) return;
    const pending: Record<string, ProgressStatus> = {};
    let prev = useProgress.getState().byRoadmap[roadmapId] ?? {};
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      const statuses = { ...pending };
      for (const k of Object.keys(pending)) delete pending[k];
      if (Object.keys(statuses).length === 0) return;
      fetch(`/api/progress/${roadmapId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ statuses }),
      }).catch(() => {
        Object.assign(pending, statuses); // retry on next change
      });
    };

    const unsub = useProgress.subscribe((state) => {
      const cur = state.byRoadmap[roadmapId] ?? {};
      for (const [nodeId, st] of Object.entries(cur)) {
        if (prev[nodeId] !== st) pending[nodeId] = st;
      }
      prev = cur;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 500);
    });

    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [authed, roadmapId]);
}
