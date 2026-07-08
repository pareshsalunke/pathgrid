"use client";

import { useProgress, progressPct } from "@/lib/stores/progress";
import { useMounted } from "@/lib/hooks/use-mounted";

export function ProgressMeter({
  roadmapId,
  contentNodeIds,
}: {
  roadmapId: string;
  contentNodeIds: string[];
}) {
  const mounted = useMounted();
  const pct = useProgress((s) =>
    progressPct(s.byRoadmap[roadmapId], contentNodeIds),
  );
  const shown = mounted ? pct : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="bg-hairline h-2 w-40 overflow-hidden rounded-full">
        <div
          className="bg-ink h-full transition-[width] duration-200"
          style={{ width: `${shown}%` }}
        />
      </div>
      <span
        data-testid="progress-pct"
        className="text-ink font-mono text-[11px]"
      >
        {shown}%
      </span>
    </div>
  );
}
