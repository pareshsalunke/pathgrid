"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProgressStatus } from "@/lib/schemas/progress";

/**
 * Phase 1 progress: per-device, localStorage-backed. Built as the optimistic cache
 * Phase 2 keeps in front of the server (merge-on-login → cross-device sync). Shape:
 * { [roadmapId]: { [nodeId]: status } }.
 */

type ProgressMap = Record<string, Record<string, ProgressStatus>>;

type ProgressState = {
  byRoadmap: ProgressMap;
  setStatus: (
    roadmapId: string,
    nodeId: string,
    status: ProgressStatus,
  ) => void;
};

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      byRoadmap: {},
      setStatus: (roadmapId, nodeId, status) =>
        set((s) => ({
          byRoadmap: {
            ...s.byRoadmap,
            [roadmapId]: {
              ...(s.byRoadmap[roadmapId] ?? {}),
              [nodeId]: status,
            },
          },
        })),
    }),
    { name: "pathgrid-progress", version: 1 },
  ),
);

/** Percentage of the given content nodes marked done. */
export function progressPct(
  map: Record<string, ProgressStatus> | undefined,
  contentNodeIds: string[],
): number {
  if (!contentNodeIds.length) return 0;
  const done = contentNodeIds.filter((id) => map?.[id] === "done").length;
  return Math.round((done / contentNodeIds.length) * 100);
}
