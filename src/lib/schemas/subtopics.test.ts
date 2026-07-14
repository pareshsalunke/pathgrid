import { describe, it, expect } from "vitest";
import { subtopicSuggestions } from "./subtopics";

describe("subtopicSuggestions schema", () => {
  it("accepts 1–8 non-empty titles and trims them", () => {
    const r = subtopicSuggestions.safeParse({
      subtopics: ["  Boxing basics  ", "Margins", "Padding"],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.subtopics[0]).toBe("Boxing basics");
  });

  it("rejects an empty array", () => {
    expect(subtopicSuggestions.safeParse({ subtopics: [] }).success).toBe(
      false,
    );
  });

  it("rejects more than 8 titles", () => {
    const nine = Array.from({ length: 9 }, (_, i) => `s${i}`);
    expect(subtopicSuggestions.safeParse({ subtopics: nine }).success).toBe(
      false,
    );
  });

  it("rejects blank / whitespace-only titles", () => {
    expect(
      subtopicSuggestions.safeParse({ subtopics: ["ok", "   "] }).success,
    ).toBe(false);
  });
});
