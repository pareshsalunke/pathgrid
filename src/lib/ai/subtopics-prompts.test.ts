import { describe, it, expect } from "vitest";
import { subtopicsPrompts } from "./subtopics-prompts";

describe("subtopicsPrompts", () => {
  it("carries the roadmap title, parent label, and a JSON-only instruction", () => {
    const { system, prompt } = subtopicsPrompts({
      roadmapTitle: "Frontend Developer",
      parentLabel: "CSS Layout",
      existingChildren: [],
    });
    expect(system).toMatch(/curriculum/i);
    expect(prompt).toContain("Frontend Developer");
    expect(prompt).toContain("CSS Layout");
    expect(prompt).toMatch(/JSON only/i);
    expect(prompt).toContain('{"subtopics"');
  });

  it("lists existing children as do-not-repeat context", () => {
    const { prompt } = subtopicsPrompts({
      roadmapTitle: "R",
      parentLabel: "Flexbox",
      existingChildren: ["flex-direction", "justify-content"],
    });
    expect(prompt).toMatch(/do NOT repeat/i);
    expect(prompt).toContain("flex-direction");
    expect(prompt).toContain("justify-content");
  });

  it("falls back to a 'no subtopics yet' line when there are no children", () => {
    const { prompt } = subtopicsPrompts({
      roadmapTitle: "R",
      parentLabel: "Grid",
      existingChildren: [],
    });
    expect(prompt).toMatch(/no subtopics yet/i);
    expect(prompt).not.toMatch(/do NOT repeat/i);
  });
});
