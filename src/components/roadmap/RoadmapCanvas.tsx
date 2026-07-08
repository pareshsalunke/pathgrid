"use client";

import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
} from "@xyflow/react";
import { nodeTypes, type RoadmapNodeData } from "./nodes";
import { CanvasControls } from "./CanvasControls";
import { Legend } from "./Legend";
import type { PositionedNode } from "@/lib/layout";
import type { GraphEdge } from "@/lib/schemas/graph";

export function RoadmapCanvas({
  roadmapId,
  nodes,
  edges,
  selectedNodeId,
  onSelect,
}: {
  roadmapId: string;
  nodes: PositionedNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}) {
  const rfNodes = useMemo<Node[]>(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        selected: n.id === selectedNodeId,
        data: {
          label: n.data.label,
          variant: n.type,
          optional: n.data.optional,
          roadmapId,
          nodeId: n.id,
        } satisfies RoadmapNodeData as unknown as Record<string, unknown>,
      })),
    [nodes, roadmapId, selectedNodeId],
  );

  const rfEdges = useMemo<Edge[]>(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        style: {
          stroke: "var(--color-ink)",
          strokeWidth: 2,
          strokeDasharray: e.data?.style === "dashed" ? "2 8" : undefined,
        },
      })),
    [edges],
  );

  return (
    <div className="relative h-[70vh] min-h-[560px] w-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelect(node.id)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.4}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.4}
          color="var(--pathgrid-canvas-grid)"
          bgColor="var(--color-block-cream)"
        />
        <CanvasControls />
        <Legend />
      </ReactFlow>
    </div>
  );
}
