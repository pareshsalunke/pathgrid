"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useProgress } from "@/lib/stores/progress";
import { useMounted } from "@/lib/hooks/use-mounted";
import { cn } from "@/lib/utils";

export type RoadmapNodeData = {
  label: string;
  variant: "title" | "topic" | "subtopic" | "label" | "section";
  optional?: boolean;
  roadmapId: string;
  nodeId: string;
};

// Handles carry edges but are visually invisible — edges meet the node border.
const hiddenHandle =
  "!h-1.5 !w-1.5 !min-h-0 !min-w-0 !border-0 !bg-transparent";

function DoneCheck() {
  return (
    <span className="border-ink bg-canvas mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full border align-[-3px]">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path
          d="M2 6.4L4.7 9 10 3.4"
          stroke="var(--color-success)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function RoadmapNode(props: NodeProps) {
  const data = props.data as unknown as RoadmapNodeData;
  const { label, variant, optional, roadmapId, nodeId } = data;

  const mounted = useMounted();
  const stored = useProgress((s) => s.byRoadmap[roadmapId]?.[nodeId]);
  const status = mounted ? (stored ?? "pending") : "pending";

  const isTitle = variant === "title";
  const isDone = status === "done";
  const isLearning = status === "learning";
  const isSkipped = status === "skipped";

  return (
    <div
      className={cn(
        "border-ink text-ink relative text-center transition-[transform,box-shadow] duration-150 select-none",
        isTitle
          ? "rounded-[10px] border-[2.5px] px-7 py-3 text-[15px] font-[700]"
          : "rounded-md border-2 px-4 py-2.5 text-[14px] font-[500]",
        optional
          ? "border-dashed bg-transparent opacity-75"
          : isDone
            ? "bg-block-mint"
            : variant === "topic"
              ? "bg-block-lilac"
              : "bg-canvas",
        !optional && !isLearning && "shadow-[0_2px_0_rgba(0,0,0,0.14)]",
        isSkipped && "line-through opacity-40",
        props.selected && "scale-[1.04]",
      )}
      style={
        isLearning
          ? {
              boxShadow:
                "0 0 0 3px var(--color-block-cream), 0 0 0 5px var(--color-ink)",
            }
          : undefined
      }
    >
      <Handle type="target" position={Position.Top} className={hiddenHandle} />
      <span className="inline-flex items-center">
        {isDone && <DoneCheck />}
        {label}
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        className={hiddenHandle}
      />
    </div>
  );
}

export const nodeTypes = {
  title: RoadmapNode,
  topic: RoadmapNode,
  subtopic: RoadmapNode,
  label: RoadmapNode,
  section: RoadmapNode,
};
