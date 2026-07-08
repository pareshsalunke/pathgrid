import ELK from "elkjs/lib/elk.bundled.js";
import type { GraphNode, GraphEdge, NodeType } from "@/lib/schemas/graph";

/**
 * Layered auto-layout for position-less graphs (docs/05). Isomorphic — runs at
 * build/SSG time in the RSC so the canvas receives positioned nodes as props.
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

const elk = new ELK();

export async function layoutGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Promise<PositionedNode[]> {
  const result = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "40",
      "elk.layered.spacing.nodeNodeBetweenLayers": "72",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    },
    children: nodes.map((n) => ({ id: n.id, ...NODE_SIZE[n.type] })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  });

  const pos = new Map<string, { x: number; y: number }>();
  for (const c of result.children ?? []) {
    pos.set(c.id, { x: c.x ?? 0, y: c.y ?? 0 });
  }

  return nodes.map((n) => ({
    ...n,
    position: pos.get(n.id) ?? { x: 0, y: 0 },
    ...NODE_SIZE[n.type],
  }));
}
