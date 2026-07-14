import type { Node, Edge } from "@xyflow/react";
import type {
  GraphEdge,
  GraphNode,
  NodeType,
  RoadmapGraph,
} from "@/lib/schemas/graph";
import { slugify, uniqueSlug } from "@/lib/slug";

/**
 * Pure graph operations for the editor — no React, no DB. React Flow's node/edge
 * arrays are the single source of truth; these functions add/delete/retype/rename
 * and (de)serialize to the domain RoadmapGraph. Every mutation is designed to keep
 * the graph valid against roadmapGraph.superRefine BY CONSTRUCTION (connected,
 * exactly one title, topic/subtopic slugged, no sequence cycles) so autosave rarely
 * has to block. See src/lib/schemas/graph.ts for the invariants.
 *
 * Two rules the read-only RoadmapCanvas doesn't follow, but the editor must:
 * - Node `data` carries slug/order/parentId so serialize is lossless (the viewer
 *   drops them). The reused RoadmapNode only reads label/variant/optional and is
 *   inert to the rest.
 * - `parentId` lives ONLY in `data`, never on the RF node — RF would make positions
 *   parent-relative and demand parent-before-child ordering; elk positions are
 *   absolute. It round-trips through `data.parentId`.
 */

export type EditorNodeData = {
  label: string;
  variant: NodeType; // mirrors node.type; RoadmapNode styles from this
  optional?: boolean;
  slug?: string;
  order?: number;
  parentId?: string; // section grouping — carried here, never as an RF parentId
  roadmapId: string;
  nodeId: string;
};

export type EditorEdgeData = {
  style: "solid" | "dashed";
  kind: "sequence" | "related";
};

export type EditorNode = Omit<Node, "data"> & { data: EditorNodeData };
export type EditorEdge = Omit<Edge, "data"> & { data: EditorEdgeData };

const NEW_LABEL: Record<Exclude<NodeType, "title">, string> = {
  topic: "New topic",
  subtopic: "New subtopic",
  label: "New label",
  section: "New section",
};

const isContent = (t: NodeType) => t === "topic" || t === "subtopic";

/** Visual stroke for the canvas; the domain style/kind live on `edge.data`. */
export function edgeStroke(style: "solid" | "dashed") {
  return {
    stroke: "var(--color-ink)",
    strokeWidth: 2,
    strokeDasharray: style === "dashed" ? "2 8" : undefined,
  };
}

// topic→subtopic reads as a dashed "related" branch; the spine is solid "sequence".
function edgeDataFor(targetType: NodeType): EditorEdgeData {
  return targetType === "subtopic"
    ? { style: "dashed", kind: "related" }
    : { style: "solid", kind: "sequence" };
}

function makeEdge(
  source: string,
  target: string,
  data: EditorEdgeData,
): EditorEdge {
  return {
    id: crypto.randomUUID(),
    source,
    target,
    data,
    style: edgeStroke(data.style),
  };
}

function slugsInUse(nodes: EditorNode[], exceptId?: string): Set<string> {
  const set = new Set<string>();
  for (const n of nodes) {
    if (n.id === exceptId) continue;
    if (n.data.slug) set.add(n.data.slug);
  }
  return set;
}

const deselect = (n: EditorNode): EditorNode =>
  n.selected ? { ...n, selected: false } : n;

const titleNodeId = (nodes: EditorNode[]): string | undefined =>
  nodes.find((n) => n.data.variant === "title")?.id;

// ── (de)serialization ──────────────────────────────────────────────

export function graphToEditor(
  graph: RoadmapGraph,
  roadmapId: string,
): { nodes: EditorNode[]; edges: EditorEdge[] } {
  const nodes: EditorNode[] = graph.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position ?? { x: 0, y: 0 },
    data: {
      label: n.data.label,
      variant: n.type,
      optional: n.data.optional,
      slug: n.data.slug,
      order: n.data.order,
      parentId: n.parentId,
      roadmapId,
      nodeId: n.id,
    },
  }));
  const edges: EditorEdge[] = graph.edges.map((e) => {
    const data = e.data ?? { style: "solid", kind: "sequence" };
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      data,
      style: edgeStroke(data.style),
    };
  });
  return { nodes, edges };
}

const round = (p: { x: number; y: number }) => ({
  x: Math.round(p.x),
  y: Math.round(p.y),
});

/**
 * RF arrays → domain graph. Strips RF-only fields (width/height/selected/measured),
 * pulls slug/order/optional/parentId back out of `data`, and mirrors meta.title from
 * the title node so the two never diverge.
 */
export function serializeGraph(
  nodes: EditorNode[],
  edges: EditorEdge[],
  meta: RoadmapGraph["meta"],
): RoadmapGraph {
  const title = nodes.find((n) => n.data.variant === "title")?.data.label;
  return {
    $schema: "pathgrid/roadmap-graph/v1",
    meta: { ...meta, title: title ?? meta.title },
    nodes: nodes.map((n): GraphNode => {
      const d = n.data;
      return {
        id: n.id,
        type: d.variant,
        position: round(n.position),
        data: {
          label: d.label,
          ...(d.slug ? { slug: d.slug } : {}),
          ...(d.order !== undefined ? { order: d.order } : {}),
          ...(d.optional !== undefined ? { optional: d.optional } : {}),
        },
        ...(d.parentId ? { parentId: d.parentId } : {}),
      };
    }),
    edges: edges.map((e): GraphEdge => ({
      id: e.id,
      source: e.source,
      target: e.target,
      data: e.data ?? { style: "solid", kind: "sequence" },
    })),
  };
}

// ── mutations ──────────────────────────────────────────────────────

/**
 * Add a node of `type`, auto-edged from the anchor (selected node → falls back to
 * the title node → first node) so the graph stays connected. Topic/subtopic get a
 * unique slug. The new node is returned selected so the panel can focus it.
 */
export function addNode(
  nodes: EditorNode[],
  edges: EditorEdge[],
  opts: {
    type: Exclude<NodeType, "title">;
    anchorId?: string;
    roadmapId: string;
  },
): { nodes: EditorNode[]; edges: EditorEdge[]; newId: string } {
  const { type, anchorId, roadmapId } = opts;
  const newId = crypto.randomUUID();
  const label = NEW_LABEL[type];
  const slug = isContent(type)
    ? uniqueSlug(slugify(label), slugsInUse(nodes))
    : undefined;

  const anchor =
    nodes.find((n) => n.id === anchorId) ??
    nodes.find((n) => n.data.variant === "title") ??
    nodes[0];
  const base = anchor?.position ?? { x: 0, y: 0 };
  const position =
    type === "subtopic"
      ? { x: base.x + 260, y: base.y }
      : { x: base.x, y: base.y + 140 };

  const newNode: EditorNode = {
    id: newId,
    type,
    position,
    selected: true,
    data: { label, variant: type, slug, roadmapId, nodeId: newId },
  };

  return {
    nodes: [...nodes.map(deselect), newNode],
    edges: anchor
      ? [...edges, makeEdge(anchor.id, newId, edgeDataFor(type))]
      : edges,
    newId,
  };
}

/**
 * Add several subtopic nodes under a parent in one batch (the AI-assist insert —
 * docs/03 §3.5). Same primitives as addNode (unique slug, dashed "related" edge,
 * crypto.randomUUID) but positions are staggered vertically so N subtopics don't
 * stack on one spot, and slugs are deduped across the whole batch. Anchor falls back
 * parent → title → first node, so the graph stays connected by construction. Blank
 * labels are skipped. Nothing is auto-selected — the user keeps their bearings.
 */
export function addSubtopics(
  nodes: EditorNode[],
  edges: EditorEdge[],
  opts: { parentId?: string; labels: string[]; roadmapId: string },
): { nodes: EditorNode[]; edges: EditorEdge[]; newIds: string[] } {
  const { parentId, labels, roadmapId } = opts;
  const parent =
    nodes.find((n) => n.id === parentId) ??
    nodes.find((n) => n.data.variant === "title") ??
    nodes[0];
  if (!parent) return { nodes, edges, newIds: [] };

  const used = slugsInUse(nodes);
  const base = parent.position ?? { x: 0, y: 0 };
  const newNodes: EditorNode[] = [];
  const newEdges: EditorEdge[] = [];
  const newIds: string[] = [];

  for (const raw of labels) {
    const label = raw.trim();
    if (!label) continue;
    const id = crypto.randomUUID();
    const slug = uniqueSlug(slugify(label), used);
    used.add(slug);
    newNodes.push({
      id,
      type: "subtopic",
      position: { x: base.x + 260, y: base.y + newIds.length * 90 },
      data: { label, variant: "subtopic", slug, roadmapId, nodeId: id },
    });
    newEdges.push(
      makeEdge(parent.id, id, { style: "dashed", kind: "related" }),
    );
    newIds.push(id);
  }

  return {
    nodes: [...nodes.map(deselect), ...newNodes],
    edges: [...edges, ...newEdges],
    newIds,
  };
}

/**
 * Delete a node (never the title node). Removes incident edges, clears any orphaned
 * `parentId`, and HEALS connectivity: former neighbours are reconnected to a shared
 * anchor (preferring the title node) with dashed "related" edges — which can never
 * form a sequence cycle — so the graph stays connected by construction.
 */
export function deleteNode(
  nodes: EditorNode[],
  edges: EditorEdge[],
  nodeId: string,
): { nodes: EditorNode[]; edges: EditorEdge[] } {
  const target = nodes.find((n) => n.id === nodeId);
  if (!target || target.data.variant === "title") return { nodes, edges };

  const neighbours = [
    ...new Set(
      edges.flatMap((e) =>
        e.source === nodeId
          ? [e.target]
          : e.target === nodeId
            ? [e.source]
            : [],
      ),
    ),
  ].filter((id) => id !== nodeId);

  const nextNodes = nodes
    .filter((n) => n.id !== nodeId)
    .map((n) =>
      n.data.parentId === nodeId
        ? { ...n, data: { ...n.data, parentId: undefined } }
        : n,
    );

  let nextEdges = edges.filter(
    (e) => e.source !== nodeId && e.target !== nodeId,
  );

  if (neighbours.length > 1) {
    const tId = titleNodeId(nodes);
    const anchor = tId && neighbours.includes(tId) ? tId : neighbours[0];
    const connected = (a: string, b: string) =>
      nextEdges.some(
        (e) =>
          (e.source === a && e.target === b) ||
          (e.source === b && e.target === a),
      );
    for (const nb of neighbours) {
      if (nb === anchor || connected(anchor, nb)) continue;
      nextEdges = [
        ...nextEdges,
        makeEdge(anchor, nb, { style: "dashed", kind: "related" }),
      ];
    }
  }

  return { nodes: nextNodes, edges: nextEdges };
}

/** Retype a node (never the title node); synthesizes a slug when it becomes content. */
export function changeNodeType(
  nodes: EditorNode[],
  nodeId: string,
  type: Exclude<NodeType, "title">,
): EditorNode[] {
  return nodes.map((n) => {
    if (n.id !== nodeId || n.data.variant === "title") return n;
    const slug =
      isContent(type) && !n.data.slug
        ? uniqueSlug(slugify(n.data.label), slugsInUse(nodes, nodeId))
        : n.data.slug;
    return { ...n, type, data: { ...n.data, variant: type, slug } };
  });
}

/** Rename a node. Slugs are generated once and kept stable; only a missing one is filled. */
export function renameNode(
  nodes: EditorNode[],
  nodeId: string,
  label: string,
): EditorNode[] {
  return nodes.map((n) => {
    if (n.id !== nodeId) return n;
    const slug =
      isContent(n.data.variant) && !n.data.slug
        ? uniqueSlug(slugify(label), slugsInUse(nodes, nodeId))
        : n.data.slug;
    return { ...n, data: { ...n.data, label, slug } };
  });
}

export function setNodeOptional(
  nodes: EditorNode[],
  nodeId: string,
  optional: boolean,
): EditorNode[] {
  return nodes.map((n) =>
    n.id === nodeId ? { ...n, data: { ...n.data, optional } } : n,
  );
}

/** Connect two nodes (from RF onConnect); no self-loops or duplicate parallels. */
export function connectNodes(
  nodes: EditorNode[],
  edges: EditorEdge[],
  source: string,
  target: string,
): EditorEdge[] {
  if (source === target) return edges;
  if (edges.some((e) => e.source === source && e.target === target))
    return edges;
  const targetType =
    nodes.find((n) => n.id === target)?.data.variant ?? "topic";
  return [...edges, makeEdge(source, target, edgeDataFor(targetType))];
}
