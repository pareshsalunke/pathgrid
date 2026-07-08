import { describe, it, expect } from "vitest";
import { layoutGraph } from "./layout";
import { frontendDeveloper } from "./db/fixtures/frontend-developer";

describe("layoutGraph", () => {
  it("assigns a finite position and size to every node", async () => {
    const positioned = await layoutGraph(
      frontendDeveloper.graph.nodes,
      frontendDeveloper.graph.edges,
    );

    expect(positioned).toHaveLength(frontendDeveloper.graph.nodes.length);
    for (const n of positioned) {
      expect(Number.isFinite(n.position.x)).toBe(true);
      expect(Number.isFinite(n.position.y)).toBe(true);
      expect(n.width).toBeGreaterThan(0);
      expect(n.height).toBeGreaterThan(0);
    }

    // a layered layout should spread nodes across multiple rows
    const rows = new Set(positioned.map((n) => Math.round(n.position.y)));
    expect(rows.size).toBeGreaterThan(1);
  });
});
