import { describe, it, expect } from "vitest";
import { validateGraph } from "@/lib/schemas/graph";
import { frontendDeveloper } from "./frontend-developer";
import { typescript } from "./typescript";

const fixtures = [frontendDeveloper, typescript];

describe.each(fixtures)("fixture: $slug", (fx) => {
  it("has a graph that passes validation", () => {
    const res = validateGraph(fx.graph);
    if (!res.success) {
      throw new Error(res.error.issues.map((i) => i.message).join("; "));
    }
    expect(res.success).toBe(true);
  });

  it("every topic row maps to a content node with the same slug", () => {
    const contentSlug = new Map(
      fx.graph.nodes
        .filter((n) => n.type === "topic" || n.type === "subtopic")
        .map((n) => [n.id, n.data.slug]),
    );
    for (const t of fx.topics) {
      expect(contentSlug.has(t.nodeId)).toBe(true);
      expect(contentSlug.get(t.nodeId)).toBe(t.slug);
    }
  });

  it("has a unique slug and category", () => {
    expect(fx.slug).toMatch(/^[a-z0-9-]+$/);
    expect(["role", "skill"]).toContain(fx.category);
  });
});
