import { describe, it, expect } from "vitest";
import { validateGraph, type RoadmapGraph } from "./graph";

const base: RoadmapGraph = {
  $schema: "pathgrid/roadmap-graph/v1",
  meta: { title: "T", level: "beginner", estHours: 1 },
  nodes: [
    { id: "t", type: "title", data: { label: "T" } },
    { id: "a", type: "topic", data: { label: "A", slug: "a", order: 1 } },
    { id: "b", type: "topic", data: { label: "B", slug: "b", order: 2 } },
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
  ],
};

const clone = () => structuredClone(base);

describe("validateGraph", () => {
  it("accepts a well-formed graph", () => {
    const res = validateGraph(base);
    expect(res.success).toBe(true);
  });

  it("rejects duplicate node ids", () => {
    const g = clone();
    g.nodes.push({
      id: "a",
      type: "topic",
      data: { label: "dup", slug: "a2" },
    });
    expect(validateGraph(g).success).toBe(false);
  });

  it("rejects an edge with a missing endpoint", () => {
    const g = clone();
    g.edges.push({ id: "e9", source: "a", target: "ghost" });
    expect(validateGraph(g).success).toBe(false);
  });

  it("rejects a graph with no title node", () => {
    const g = clone();
    g.nodes[0].type = "label";
    expect(validateGraph(g).success).toBe(false);
  });

  it("rejects a graph with two title nodes", () => {
    const g = clone();
    g.nodes[1].type = "title";
    expect(validateGraph(g).success).toBe(false);
  });

  it("rejects a topic without a slug", () => {
    const g = clone();
    delete g.nodes[1].data.slug;
    expect(validateGraph(g).success).toBe(false);
  });

  it("rejects a disconnected graph", () => {
    const g = clone();
    g.nodes.push({ id: "c", type: "topic", data: { label: "C", slug: "c" } });
    expect(validateGraph(g).success).toBe(false);
  });

  it("rejects a cycle among sequence edges", () => {
    const g = clone();
    g.edges.push({
      id: "e3",
      source: "b",
      target: "a",
      data: { style: "solid", kind: "sequence" },
    });
    expect(validateGraph(g).success).toBe(false);
  });
});
