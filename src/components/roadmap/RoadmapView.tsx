"use client";

import { useState } from "react";
import { RoadmapCanvas } from "./RoadmapCanvas";
import { ListView } from "./ListView";
import { TopicDrawer } from "./TopicDrawer";
import { cn } from "@/lib/utils";
import type { PositionedNode } from "@/lib/layout";
import type { GraphEdge } from "@/lib/schemas/graph";
import type { DrawerTopic } from "./types";

export function RoadmapView({
  roadmapId,
  nodes,
  edges,
  topics,
}: {
  roadmapId: string;
  nodes: PositionedNode[];
  edges: GraphEdge[];
  topics: Record<string, DrawerTopic>;
}) {
  const [view, setView] = useState<"map" | "list">("map");
  const [selected, setSelected] = useState<string | null>(null);

  const onSelect = (id: string) => setSelected(topics[id] ? id : null);
  const selectedTopic = selected ? topics[selected] : null;

  return (
    <div className="border-hairline relative border-y">
      <div className="border-ink bg-canvas absolute top-5 left-5 z-30 flex gap-0.5 rounded-full border-2 p-[3px]">
        {(["map", "list"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "font-link rounded-full px-4 py-1.5 text-[14px] capitalize",
              view === v ? "bg-primary text-on-primary" : "text-ink",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "map" ? (
        <RoadmapCanvas
          roadmapId={roadmapId}
          nodes={nodes}
          edges={edges}
          selectedNodeId={selected}
          onSelect={onSelect}
        />
      ) : (
        <ListView roadmapId={roadmapId} nodes={nodes} onSelect={onSelect} />
      )}

      {selectedTopic && (
        <TopicDrawer
          roadmapId={roadmapId}
          topic={selectedTopic}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
