import ELK from "elkjs/lib/elk.bundled.js";
import type { GraphNode, GraphEdge } from "@/lib/schemas/graph";
import { NODE_SIZE, type PositionedNode } from "@/lib/node-size";

/**
 * Layered auto-layout for position-less graphs (docs/05). Runs at build/SSG
 * time (or generation time) on the server. This module instantiates elkjs at
 * module scope — client components must import NODE_SIZE/PositionedNode from
 * lib/node-size, never from here (a value import drags ~1.4MB of elk into the
 * client bundle and can stall hydration).
 */

export { NODE_SIZE, type PositionedNode };

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
