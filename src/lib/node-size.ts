import type { GraphNode, NodeType } from "@/lib/schemas/graph";

/**
 * Canvas render dimensions per node type. Client-safe — deliberately separate
 * from layout.ts, which imports (and instantiates) elkjs at module scope and
 * must stay server-only. Client code needing NODE_SIZE/PositionedNode imports
 * from here, never from layout.ts.
 */

export const NODE_SIZE: Record<NodeType, { width: number; height: number }> = {
  title: { width: 240, height: 60 },
  topic: { width: 200, height: 48 },
  subtopic: { width: 180, height: 42 },
  label: { width: 180, height: 42 },
  section: { width: 220, height: 46 },
};

export type PositionedNode = GraphNode & {
  position: { x: number; y: number };
  width: number;
  height: number;
};
