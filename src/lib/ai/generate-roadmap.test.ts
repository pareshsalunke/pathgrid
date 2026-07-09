import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./registry", () => ({
  getModel: vi.fn((_config: unknown, tier: string) => `${tier}-model`),
}));
vi.mock("./structured", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./structured")>();
  return { ...actual, generateStructured: vi.fn() };
});

import { generateStructured } from "./structured";
import { generateRoadmap, GenerationInvalidError } from "./generate-roadmap";
import type { ProviderConfig } from "./registry";

const generateStructuredMock = vi.mocked(generateStructured);

const config: ProviderConfig = {
  provider: "anthropic",
  apiKey: "k",
  models: { smart: "s", fast: "f" },
};

const input = {
  goal: "Learn TypeScript",
  level: "intermediate" as const,
  hoursPerWeek: 4,
};

const outline = {
  title: "TypeScript Path",
  stages: [
    {
      name: "Basics",
      topics: [{ title: "Types", optional: false, subtopics: [] }],
    },
    {
      name: "Advanced",
      topics: [{ title: "Generics", optional: false, subtopics: [] }],
    },
  ],
};

// Connected, one title node, no sequence cycles — passes roadmapGraph superRefine.
const validGraphify = {
  nodes: [
    { id: "title", type: "title" as const, data: { label: "TypeScript Path" } },
    { id: "sec-basics", type: "section" as const, data: { label: "Basics" } },
    {
      id: "types",
      type: "topic" as const,
      parentId: "sec-basics",
      data: { label: "Types", slug: "types", order: 1 },
    },
  ],
  edges: [
    {
      id: "e1",
      source: "title",
      target: "sec-basics",
      data: { style: "solid" as const, kind: "sequence" as const },
    },
    {
      id: "e2",
      source: "sec-basics",
      target: "types",
      data: { style: "solid" as const, kind: "sequence" as const },
    },
  ],
};

const usage = (n: number) => ({ inputTokens: n, outputTokens: n, calls: 1 });

beforeEach(() => {
  generateStructuredMock.mockReset();
});

describe("generateRoadmap", () => {
  it("runs outline → graphify → layout with deterministic meta and positions", async () => {
    generateStructuredMock
      .mockResolvedValueOnce({
        data: outline,
        usage: usage(100),
        repaired: false,
      })
      .mockResolvedValueOnce({
        data: validGraphify,
        usage: usage(200),
        repaired: false,
      });

    const steps: string[] = [];
    const result = await generateRoadmap({
      config,
      input,
      onProgress: (s) => steps.push(s),
    });

    expect(steps).toEqual(["outline", "graphify", "layout"]);
    expect(result.title).toBe("TypeScript Path");
    // Meta built by us: intermediate → mixed; estHours = hours × 12.
    expect(result.graph.meta).toEqual({
      title: "TypeScript Path",
      level: "mixed",
      estHours: 48,
    });
    // Positions baked in on every node; elk-only fields stripped.
    for (const node of result.graph.nodes) {
      expect(node.position).toBeDefined();
      expect(node).not.toHaveProperty("width");
    }
    // Usage aggregated across both passes.
    expect(result.usage).toEqual({
      inputTokens: 300,
      outputTokens: 300,
      calls: 2,
    });
    // Tiers: both calls use smart primary + fast repair.
    for (const call of generateStructuredMock.mock.calls) {
      expect(call[0].model).toBe("smart-model");
      expect(call[0].repairModel).toBe("fast-model");
    }
  });

  it("throws GenerationInvalidError when the assembled graph fails Zod", async () => {
    generateStructuredMock
      .mockResolvedValueOnce({
        data: outline,
        usage: usage(10),
        repaired: false,
      })
      .mockResolvedValueOnce({
        // disconnected node + missing slug → superRefine failures
        data: {
          nodes: [
            { id: "title", type: "title" as const, data: { label: "X" } },
            { id: "orphan", type: "topic" as const, data: { label: "Orphan" } },
          ],
          edges: [],
        },
        usage: usage(20),
        repaired: true,
      });

    const err = await generateRoadmap({ config, input }).catch((e) => e);
    expect(err).toBeInstanceOf(GenerationInvalidError);
    expect(err.issues.length).toBeGreaterThan(0);
    expect(err.usage.calls).toBe(2);
  });
});
