import { z } from "zod";

/**
 * Roadmap graph schema — the authoritative shape from docs/04-data-model.md §3.
 * React-Flow-native so the same JSON drives viewer, editor, and AI generation.
 * Never render a graph that failed this schema (CLAUDE.md).
 */

export const nodeType = z.enum([
  "title",
  "topic",
  "subtopic",
  "label",
  "section",
]);
export type NodeType = z.infer<typeof nodeType>;

export const edgeStyle = z.enum(["solid", "dashed"]);
export const edgeKind = z.enum(["sequence", "related"]);

export const graphPosition = z.object({ x: z.number(), y: z.number() });

export const graphNodeData = z.object({
  label: z.string(),
  slug: z.string().optional(), // only topic/subtopic
  order: z.number().optional(), // learning sequence hint
  optional: z.boolean().optional(), // renders dashed / "nice to know"
});

export const graphNode = z.object({
  id: z.string().min(1),
  type: nodeType,
  position: graphPosition.optional(), // filled by elkjs auto-layout when absent
  data: graphNodeData,
  parentId: z.string().optional(), // section grouping
});
export type GraphNode = z.infer<typeof graphNode>;

export const graphEdge = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  data: z.object({ style: edgeStyle, kind: edgeKind }).optional(),
});
export type GraphEdge = z.infer<typeof graphEdge>;

export const graphMeta = z.object({
  title: z.string(),
  level: z.enum(["beginner", "mixed", "advanced"]),
  estHours: z.number(),
});

export const roadmapGraph = z
  .object({
    $schema: z.literal("pathgrid/roadmap-graph/v1"),
    meta: graphMeta,
    nodes: z.array(graphNode),
    edges: z.array(graphEdge),
  })
  .superRefine((graph, ctx) => {
    const ids = graph.nodes.map((n) => n.id);
    const idSet = new Set(ids);

    // unique node ids
    if (idSet.size !== ids.length) {
      ctx.addIssue({ code: "custom", message: "Node ids must be unique" });
    }

    // exactly one title node
    const titleCount = graph.nodes.filter((n) => n.type === "title").length;
    if (titleCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message: `Graph must have exactly one 'title' node (found ${titleCount})`,
      });
    }

    // every topic/subtopic has a non-empty label + slug
    for (const n of graph.nodes) {
      if (n.type === "topic" || n.type === "subtopic") {
        if (!n.data.label.trim()) {
          ctx.addIssue({
            code: "custom",
            message: `Node ${n.id}: ${n.type} requires a non-empty label`,
          });
        }
        if (!n.data.slug?.trim()) {
          ctx.addIssue({
            code: "custom",
            message: `Node ${n.id}: ${n.type} requires a slug`,
          });
        }
      }
    }

    // every edge endpoint exists
    for (const e of graph.edges) {
      if (!idSet.has(e.source)) {
        ctx.addIssue({
          code: "custom",
          message: `Edge ${e.id}: source '${e.source}' does not exist`,
        });
      }
      if (!idSet.has(e.target)) {
        ctx.addIssue({
          code: "custom",
          message: `Edge ${e.id}: target '${e.target}' does not exist`,
        });
      }
    }

    // graph is connected (undirected)
    if (idSet.size > 1) {
      const adj = new Map<string, string[]>();
      for (const id of idSet) adj.set(id, []);
      for (const e of graph.edges) {
        if (idSet.has(e.source) && idSet.has(e.target)) {
          adj.get(e.source)!.push(e.target);
          adj.get(e.target)!.push(e.source);
        }
      }
      const seen = new Set<string>([ids[0]]);
      const stack = [ids[0]];
      while (stack.length) {
        for (const nb of adj.get(stack.pop()!) ?? []) {
          if (!seen.has(nb)) {
            seen.add(nb);
            stack.push(nb);
          }
        }
      }
      if (seen.size !== idSet.size) {
        ctx.addIssue({
          code: "custom",
          message: `Graph is not connected (${seen.size}/${idSet.size} nodes reachable)`,
        });
      }
    }

    // no cycles among 'sequence' edges (directed)
    const seqAdj = new Map<string, string[]>();
    for (const id of idSet) seqAdj.set(id, []);
    for (const e of graph.edges) {
      const kind = e.data?.kind ?? "sequence";
      if (kind === "sequence" && idSet.has(e.source) && idSet.has(e.target)) {
        seqAdj.get(e.source)!.push(e.target);
      }
    }
    const color = new Map<string, 0 | 1 | 2>(); // 0 unvisited, 1 visiting, 2 done
    let hasCycle = false;
    const visit = (u: string) => {
      color.set(u, 1);
      for (const v of seqAdj.get(u) ?? []) {
        const c = color.get(v) ?? 0;
        if (c === 1) {
          hasCycle = true;
          return;
        }
        if (c === 0) {
          visit(v);
          if (hasCycle) return;
        }
      }
      color.set(u, 2);
    };
    for (const id of idSet) {
      if ((color.get(id) ?? 0) === 0) {
        visit(id);
        if (hasCycle) break;
      }
    }
    if (hasCycle) {
      ctx.addIssue({
        code: "custom",
        message: "Cycle detected among 'sequence' edges",
      });
    }
  });

export type RoadmapGraph = z.infer<typeof roadmapGraph>;

export function validateGraph(input: unknown) {
  return roadmapGraph.safeParse(input);
}

/**
 * The "15–80 content nodes" rule applies only to OFFICIAL roadmaps. Kept out of the
 * core parse so small samples and tests still validate. Returns a list of problems
 * (empty = ok).
 */
export function assertOfficialSize(graph: RoadmapGraph): string[] {
  const content = graph.nodes.filter(
    (n) => n.type === "topic" || n.type === "subtopic",
  ).length;
  const errors: string[] = [];
  if (content < 15)
    errors.push(`Official roadmap needs ≥15 content nodes (has ${content})`);
  if (content > 80)
    errors.push(`Official roadmap needs ≤80 content nodes (has ${content})`);
  return errors;
}
