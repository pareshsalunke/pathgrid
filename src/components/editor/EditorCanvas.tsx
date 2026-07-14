"use client";

import "@xyflow/react/dist/style.css";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import { nodeTypes } from "@/components/roadmap/nodes";
import { CanvasControls } from "@/components/roadmap/CanvasControls";
import { Legend } from "@/components/roadmap/Legend";
import type { EditorNode, EditorEdge } from "@/lib/editor/graph-ops";

/**
 * Interactive editor canvas. Deliberately separate from the read-only RoadmapCanvas
 * (which backs the public SSG /[roadmapSlug] page): here nodes are draggable and
 * connectable and state is mutable. Reuses the shared nodeTypes / controls / legend
 * for visual consistency. Keyboard delete is OFF — deletion routes through the
 * properties panel so deleteNode's title-guard + connectivity heal always run.
 */
export function EditorCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
}: {
  nodes: EditorNode[];
  edges: EditorEdge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
}) {
  return (
    <div className="pg-editor bg-block-cream relative h-full w-full">
      <ReactFlow
        nodes={nodes as unknown as Node[]}
        edges={edges as unknown as Edge[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.3}
        maxZoom={1.8}
        deleteKeyCode={null}
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
