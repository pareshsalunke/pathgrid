"use client";

import { useProgress } from "@/lib/stores/progress";
import { useMounted } from "@/lib/hooks/use-mounted";
import { cn } from "@/lib/utils";
import type { PositionedNode } from "@/lib/layout";
import type { ProgressStatus } from "@/lib/schemas/progress";

const DOT: Record<ProgressStatus, string> = {
  done: "bg-block-mint",
  learning: "bg-block-lilac",
  skipped: "bg-block-lilac opacity-40",
  pending: "bg-canvas",
};

function Row({
  roadmapId,
  node,
  onSelect,
}: {
  roadmapId: string;
  node: PositionedNode;
  onSelect: (id: string) => void;
}) {
  const mounted = useMounted();
  const stored = useProgress((s) => s.byRoadmap[roadmapId]?.[node.id]);
  const status: ProgressStatus = mounted ? (stored ?? "pending") : "pending";
  const isSub = node.type === "subtopic";

  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      className={cn(
        "border-ink bg-canvas hover:bg-surface-soft flex items-center gap-3 rounded-md border-2 px-4 py-3 text-left",
        isSub && "ml-6",
      )}
    >
      <span
        className={cn(
          "border-ink h-3 w-3 shrink-0 rounded-[3px] border-[1.5px]",
          DOT[status],
        )}
      />
      <span
        className={cn(
          "font-link text-ink flex-1 text-[16px]",
          isSub && "font-body-sm text-[14px]",
          status === "skipped" && "line-through opacity-55",
        )}
      >
        {node.data.label}
        {node.data.optional && (
          <span className="ml-2 font-mono text-[9px] tracking-[0.5px] uppercase opacity-55">
            optional
          </span>
        )}
      </span>
      <span className="text-ink/60 font-mono text-[10px] tracking-[0.5px] uppercase">
        {status}
      </span>
    </button>
  );
}

export function ListView({
  roadmapId,
  nodes,
  onSelect,
}: {
  roadmapId: string;
  nodes: PositionedNode[];
  onSelect: (id: string) => void;
}) {
  const content = nodes
    .filter((n) => n.type === "topic" || n.type === "subtopic")
    .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0));

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-2 px-4 py-10">
      {content.map((n) => (
        <Row key={n.id} roadmapId={roadmapId} node={n} onSelect={onSelect} />
      ))}
    </div>
  );
}
