import { describe, it, expect } from "vitest";
import {
  outlineSchema,
  graphifySchema,
  outlinePrompts,
  graphifyPrompts,
} from "./roadmap-prompts";

const outline = {
  title: "Frontend Basics",
  stages: [
    {
      name: "Foundations",
      topics: [{ title: "HTML", optional: false, subtopics: ["Forms"] }],
    },
    {
      name: "Styling",
      topics: [{ title: "CSS", optional: false, subtopics: [] }],
    },
  ],
};

describe("outlineSchema", () => {
  it("accepts the documented shape", () => {
    expect(outlineSchema.safeParse(outline).success).toBe(true);
  });

  it("rejects missing title and empty stages", () => {
    expect(outlineSchema.safeParse({ stages: [] }).success).toBe(false);
    expect(outlineSchema.safeParse({ title: "x", stages: [] }).success).toBe(
      false,
    );
  });
});

describe("graphifySchema", () => {
  it("accepts nodes + edges in the doc-04 §3 shape", () => {
    const parsed = graphifySchema.safeParse({
      nodes: [{ id: "title", type: "title", data: { label: "X" } }],
      edges: [],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("outlinePrompts", () => {
  it("injects the learner context and effort cap (docs/06 §3.6)", () => {
    const { system, prompt } = outlinePrompts({
      goal: "Become a frontend dev",
      level: "beginner",
      known: "some HTML",
      hoursPerWeek: 5,
    });
    expect(system).toContain("curriculum designer");
    expect(prompt).toContain("Become a frontend dev");
    expect(prompt).toContain("beginner");
    expect(prompt).toContain("some HTML");
    expect(prompt).toContain("5 hours/week");
    expect(prompt).toContain("60 hours"); // 5 × 12 cap
    expect(prompt).toContain("4-6 stages");
  });

  it("handles absent prior knowledge", () => {
    const { prompt } = outlinePrompts({
      goal: "Learn SQL for analytics",
      level: "intermediate",
      hoursPerWeek: 3,
    });
    expect(prompt).toContain("none stated");
  });
});

describe("graphifyPrompts", () => {
  it("embeds the conventions, the format example, and the outline", () => {
    const { system, prompt } = graphifyPrompts(outline);
    expect(system).toContain("never invent new topics");
    expect(prompt).toContain('"style":"solid"');
    expect(prompt).toContain("kebab-case");
    expect(prompt).toContain("Frontend Basics"); // outline payload embedded
    expect(prompt).toContain("Do NOT include position");
  });
});
