import { describe, it, expect } from "vitest";
import {
  quizQuestion,
  quizQuestions,
  quizGeneration,
  toPublicQuestions,
  type QuizQuestion,
} from "./quiz";

const valid: QuizQuestion = {
  q: "What is 2 + 2?",
  options: ["3", "4", "5", "6"],
  answerIdx: 1,
  why: "Basic arithmetic.",
};

const make = (n: number): QuizQuestion[] =>
  Array.from({ length: n }, () => valid);

describe("quiz schema", () => {
  it("accepts a well-formed question", () => {
    expect(quizQuestion.parse(valid)).toEqual(valid);
  });

  it("requires exactly four options", () => {
    expect(
      quizQuestion.safeParse({ ...valid, options: ["a", "b", "c"] }).success,
    ).toBe(false);
    expect(
      quizQuestion.safeParse({ ...valid, options: ["a", "b", "c", "d", "e"] })
        .success,
    ).toBe(false);
  });

  it("rejects an out-of-range answerIdx", () => {
    expect(quizQuestion.safeParse({ ...valid, answerIdx: 4 }).success).toBe(
      false,
    );
    expect(quizQuestion.safeParse({ ...valid, answerIdx: -1 }).success).toBe(
      false,
    );
    expect(quizQuestion.safeParse({ ...valid, answerIdx: 1.5 }).success).toBe(
      false,
    );
  });

  it("rejects empty prompt / option / explanation", () => {
    expect(quizQuestion.safeParse({ ...valid, q: "" }).success).toBe(false);
    expect(
      quizQuestion.safeParse({ ...valid, options: ["", "b", "c", "d"] })
        .success,
    ).toBe(false);
    expect(quizQuestion.safeParse({ ...valid, why: "" }).success).toBe(false);
  });

  it("accepts 4–6 questions, rejects fewer or more", () => {
    expect(quizQuestions.safeParse(make(3)).success).toBe(false);
    expect(quizQuestions.safeParse(make(4)).success).toBe(true);
    expect(quizQuestions.safeParse(make(5)).success).toBe(true);
    expect(quizQuestions.safeParse(make(6)).success).toBe(true);
    expect(quizQuestions.safeParse(make(7)).success).toBe(false);
  });

  it("quizGeneration wraps the array under `questions`", () => {
    expect(quizGeneration.safeParse({ questions: make(5) }).success).toBe(true);
    expect(quizGeneration.safeParse(make(5)).success).toBe(false); // bare array rejected
  });

  it("toPublicQuestions strips answerIdx and why", () => {
    const pub = toPublicQuestions([valid]);
    expect(pub).toEqual([{ q: valid.q, options: valid.options }]);
    expect(pub[0]).not.toHaveProperty("answerIdx");
    expect(pub[0]).not.toHaveProperty("why");
  });
});
