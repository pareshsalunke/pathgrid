import { describe, it, expect } from "vitest";
import { validateGraph, type RoadmapGraph } from "@/lib/schemas/graph";
import {
  graphToEditor,
  serializeGraph,
  addNode,
  addSubtopics,
  deleteNode,
  changeNodeType,
  renameNode,
  connectNodes,
  type EditorNode,
} from "./graph-ops";

const RM = "rm-1";

const base: RoadmapGraph = {
  $schema: "pathgrid/roadmap-graph/v1",
  meta: { title: "Test Path", level: "beginner", estHours: 10 },
  nodes: [
    {
      id: "t",
      type: "title",
      position: { x: 0, y: 0 },
      data: { label: "Test Path" },
    },
    {
      id: "a",
      type: "topic",
      position: { x: 0, y: 120 },
      data: { label: "A", slug: "a", order: 1 },
    },
    {
      id: "b",
      type: "topic",
      position: { x: 0, y: 240 },
      data: { label: "B", slug: "b", order: 2 },
    },
    {
      id: "a1",
      type: "subtopic",
      position: { x: 260, y: 120 },
      data: { label: "A1", slug: "a1" },
      parentId: "a",
    },
  ],
  edges: [
    {
      id: "e1",
      source: "t",
      target: "a",
      data: { style: "solid", kind: "sequence" },
    },
    {
      id: "e2",
      source: "a",
      target: "b",
      data: { style: "solid", kind: "sequence" },
    },
    {
      id: "e3",
      source: "a",
      target: "a1",
      data: { style: "dashed", kind: "related" },
    },
  ],
};

const editor = () => graphToEditor(base, RM);
const ser = (n: EditorNode[], e = editor().edges) =>
  serializeGraph(n, e, base.meta);
const expectValid = (g: RoadmapGraph) => {
  const r = validateGraph(g);
  if (!r.success)
    throw new Error(r.error.issues.map((i) => i.message).join("; "));
  expect(r.success).toBe(true);
};

describe("graphToEditor / serializeGraph round-trip", () => {
  it("re-serializes to a valid graph, preserving structure and data", () => {
    const { nodes, edges } = editor();
    const out = serializeGraph(nodes, edges, base.meta);
    expectValid(out);
    expect(out.nodes).toHaveLength(4);
    expect(out.edges).toHaveLength(3);
    const a = out.nodes.find((n) => n.id === "a")!;
    expect(a.data).toMatchObject({ slug: "a", order: 1 });
    const a1 = out.nodes.find((n) => n.id === "a1")!;
    expect(a1.parentId).toBe("a"); // parentId round-trips via data
    expect(out.edges.find((e) => e.id === "e3")!.data).toEqual({
      style: "dashed",
      kind: "related",
    });
  });

  it("strips RF-only fields (width/height/selected) and rounds positions", () => {
    const { nodes } = editor();
    const dirty = nodes.map((n) =>
      n.id === "a"
        ? ({
            ...n,
            selected: true,
            width: 200,
            height: 48,
            position: { x: 3.7, y: 119.2 },
          } as EditorNode)
        : n,
    );
    const a = ser(dirty).nodes.find((n) => n.id === "a")!;
    expect(a.position).toEqual({ x: 4, y: 119 });
    expect(a).not.toHaveProperty("width");
    expect(a).not.toHaveProperty("selected");
  });

  it("mirrors meta.title from the title node label", () => {
    const renamed = renameNode(editor().nodes, "t", "Renamed Path");
    expect(ser(renamed).meta.title).toBe("Renamed Path");
  });
});

describe("addNode", () => {
  it("adds a topic auto-edged from the anchor, valid, with a slug", () => {
    const { nodes, edges } = editor();
    const r = addNode(nodes, edges, {
      type: "topic",
      anchorId: "b",
      roadmapId: RM,
    });
    expect(r.nodes).toHaveLength(5);
    expect(r.edges).toHaveLength(4);
    const created = r.nodes.find((n) => n.id === r.newId)!;
    expect(created.data.slug).toBeTruthy();
    expect(created.selected).toBe(true);
    expect(r.edges.some((e) => e.source === "b" && e.target === r.newId)).toBe(
      true,
    );
    expectValid(ser(r.nodes, r.edges));
  });

  it("adds a subtopic with a dashed related edge", () => {
    const { nodes, edges } = editor();
    const r = addNode(nodes, edges, {
      type: "subtopic",
      anchorId: "a",
      roadmapId: RM,
    });
    const edge = r.edges.find((e) => e.target === r.newId)!;
    expect(edge.data).toEqual({ style: "dashed", kind: "related" });
    expectValid(ser(r.nodes, r.edges));
  });

  it("falls back to the title node as anchor and dedupes slugs", () => {
    const start = editor();
    const one = addNode(start.nodes, start.edges, {
      type: "topic",
      roadmapId: RM,
    });
    const two = addNode(one.nodes, one.edges, { type: "topic", roadmapId: RM });
    const s1 = one.nodes.find((n) => n.id === one.newId)!.data.slug;
    const s2 = two.nodes.find((n) => n.id === two.newId)!.data.slug;
    expect(s1).not.toBe(s2); // uniqueSlug appended -2
    expect(
      one.edges.some((e) => e.source === "t" && e.target === one.newId),
    ).toBe(true);
    expectValid(ser(two.nodes, two.edges));
  });
});

describe("addSubtopics", () => {
  it("adds N dashed-related subtopics under the parent, staying valid", () => {
    const { nodes, edges } = editor();
    const r = addSubtopics(nodes, edges, {
      parentId: "b",
      labels: ["First", "Second", "Third"],
      roadmapId: RM,
    });
    expect(r.newIds).toHaveLength(3);
    expect(r.nodes).toHaveLength(7); // 4 original + 3 new
    for (const id of r.newIds) {
      const node = r.nodes.find((n) => n.id === id)!;
      expect(node.data.variant).toBe("subtopic");
      expect(node.data.slug).toBeTruthy();
      const edge = r.edges.find((e) => e.target === id)!;
      expect(edge.source).toBe("b");
      expect(edge.data).toEqual({ style: "dashed", kind: "related" });
    }
    expectValid(ser(r.nodes, r.edges));
  });

  it("staggers positions so subtopics don't stack, and dedupes slugs across the batch", () => {
    const { nodes, edges } = editor();
    const r = addSubtopics(nodes, edges, {
      parentId: "b",
      labels: ["Same", "Same", "Same"],
      roadmapId: RM,
    });
    const created = r.newIds.map((id) => r.nodes.find((n) => n.id === id)!);
    const ys = created.map((n) => n.position.y);
    expect(new Set(ys).size).toBe(3); // distinct y positions
    const slugs = created.map((n) => n.data.slug);
    expect(new Set(slugs).size).toBe(3); // uniqueSlug appended -2, -3
    expectValid(ser(r.nodes, r.edges));
  });

  it("skips blank labels and falls back to the title node when parentId is unknown", () => {
    const { nodes, edges } = editor();
    const r = addSubtopics(nodes, edges, {
      parentId: "does-not-exist",
      labels: ["Kept", "   ", ""],
      roadmapId: RM,
    });
    expect(r.newIds).toHaveLength(1); // only "Kept"
    const edge = r.edges.find((e) => e.target === r.newIds[0])!;
    expect(edge.source).toBe("t"); // fell back to the title node
    expectValid(ser(r.nodes, r.edges));
  });
});

describe("deleteNode", () => {
  it("removes a leaf and stays valid", () => {
    const { nodes, edges } = editor();
    const r = deleteNode(nodes, edges, "b");
    expect(r.nodes.find((n) => n.id === "b")).toBeUndefined();
    expectValid(ser(r.nodes, r.edges));
  });

  it("heals connectivity when deleting a hub node, clearing orphaned parentId", () => {
    const { nodes, edges } = editor();
    const r = deleteNode(nodes, edges, "a"); // a is the hub (t-a, a-b, a-a1)
    expect(r.nodes).toHaveLength(3);
    const a1 = r.nodes.find((n) => n.id === "a1")!;
    expect(a1.data.parentId).toBeUndefined(); // parent 'a' is gone
    expectValid(ser(r.nodes, r.edges)); // b and a1 reconnected to the title
  });

  it("refuses to delete the title node", () => {
    const { nodes, edges } = editor();
    const r = deleteNode(nodes, edges, "t");
    expect(r.nodes).toHaveLength(4);
    expect(r.edges).toHaveLength(3);
  });
});

describe("changeNodeType", () => {
  it("synthesizes a slug when a node becomes content", () => {
    const { nodes, edges } = editor();
    const added = addNode(nodes, edges, {
      type: "label",
      anchorId: "b",
      roadmapId: RM,
    });
    const labelNode = added.nodes.find((n) => n.id === added.newId)!;
    expect(labelNode.data.slug).toBeUndefined(); // labels carry no slug
    const retyped = changeNodeType(added.nodes, added.newId, "topic");
    expect(retyped.find((n) => n.id === added.newId)!.data.slug).toBeTruthy();
    expectValid(ser(retyped, added.edges));
  });

  it("refuses to retype the title node", () => {
    const retyped = changeNodeType(editor().nodes, "t", "topic");
    expect(retyped.find((n) => n.id === "t")!.data.variant).toBe("title");
  });
});

describe("renameNode", () => {
  it("keeps an existing slug stable", () => {
    const renamed = renameNode(editor().nodes, "a", "A Totally New Label");
    const a = renamed.find((n) => n.id === "a")!;
    expect(a.data.label).toBe("A Totally New Label");
    expect(a.data.slug).toBe("a"); // slug generated once, stays stable
  });
});

describe("connectNodes", () => {
  it("adds an edge, rejecting self-loops and duplicates", () => {
    const { nodes, edges } = editor();
    const linked = connectNodes(nodes, edges, "b", "a1");
    expect(linked).toHaveLength(4);
    expect(connectNodes(nodes, linked, "b", "a1")).toHaveLength(4); // dup rejected
    expect(connectNodes(nodes, edges, "a", "a")).toHaveLength(3); // self-loop rejected
  });
});
