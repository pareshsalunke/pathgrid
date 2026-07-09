import { describe, it, expect } from "vitest";
import { quizPrompts } from "./quiz-prompts";

describe("quizPrompts", () => {
  it("carries the fair-MCQ persona, topic, context, and difficulty split", () => {
    const { system, prompt } = quizPrompts({
      title: "Closures",
      context: "A closure captures its lexical scope.",
    });
    expect(system).toContain("fair multiple-choice questions");
    expect(prompt).toContain("Topic: Closures.");
    expect(prompt).toContain("A closure captures its lexical scope.");
    expect(prompt).toContain("2 recall, 2 application, 1 tricky-but-fair");
    expect(prompt).toContain("answerIdx");
  });

  it("falls back to a label-only instruction when context is missing", () => {
    const { prompt } = quizPrompts({ title: "Event loop", context: null });
    expect(prompt).toContain("Topic: Event loop.");
    expect(prompt).toContain("no stored description");
  });

  it("treats blank context as missing", () => {
    const { prompt } = quizPrompts({ title: "X", context: "   " });
    expect(prompt).toContain("no stored description");
  });
});
