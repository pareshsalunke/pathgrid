import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db/quiz", () => ({
  getQuizById: vi.fn(),
  createQuizAttempt: vi.fn(),
}));
vi.mock("@/lib/track", () => ({ track: vi.fn(async () => {}) }));

import { auth } from "@/auth";
import { getQuizById, createQuizAttempt } from "@/lib/db/quiz";
import { track } from "@/lib/track";
import { POST } from "./route";

const authMock = vi.mocked(auth);
const getQuizMock = vi.mocked(getQuizById);
const createAttemptMock = vi.mocked(createQuizAttempt);
const trackMock = vi.mocked(track);

const USER_ID = "3f8b8f60-0f4b-4d5f-9d5c-000000000000";
const QUIZ_ID = "3f8b8f60-0f4b-4d5f-9d5c-222222222222";

// answerIdx: [0, 1, 2]
const quiz = {
  id: QUIZ_ID,
  roadmapId: "3f8b8f60-0f4b-4d5f-9d5c-111111111111",
  nodeId: "a",
  questions: [
    { q: "Q0", options: ["a", "b", "c", "d"], answerIdx: 0, why: "w0" },
    { q: "Q1", options: ["a", "b", "c", "d"], answerIdx: 1, why: "w1" },
    { q: "Q2", options: ["a", "b", "c", "d"], answerIdx: 2, why: "w2" },
  ],
};

function post(body: unknown) {
  return new Request("http://localhost/api/quiz-attempts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
  getQuizMock.mockResolvedValue(quiz);
  createAttemptMock.mockResolvedValue({ id: "attempt-1" });
});

describe("POST /api/quiz-attempts", () => {
  it("401 without a session (no BYOK key required — grading is server-side)", async () => {
    authMock.mockResolvedValue(null as never);
    expect(
      (await POST(post({ quizId: QUIZ_ID, answers: [0, 1, 2] }))).status,
    ).toBe(401);
  });

  it("400 on a malformed body", async () => {
    const res = await POST(post({ answers: [0, 1, 2] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_body");
  });

  it("404 when the quiz is unknown", async () => {
    getQuizMock.mockResolvedValue(null);
    const res = await POST(post({ quizId: QUIZ_ID, answers: [0, 1, 2] }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("quiz_not_found");
  });

  it("400 when the answer count doesn't match the question count", async () => {
    const res = await POST(post({ quizId: QUIZ_ID, answers: [0, 1] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_body");
  });

  it("400 when an answer is out of the option range", async () => {
    const res = await POST(post({ quizId: QUIZ_ID, answers: [0, 1, 5] }));
    expect(res.status).toBe(400);
  });

  it("grades a perfect submission and reveals the answers + why", async () => {
    const res = await POST(post({ quizId: QUIZ_ID, answers: [0, 1, 2] }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.score).toBe(3);
    expect(data.total).toBe(3);
    expect(data.results).toEqual([
      { correct: true, answerIdx: 0, why: "w0" },
      { correct: true, answerIdx: 1, why: "w1" },
      { correct: true, answerIdx: 2, why: "w2" },
    ]);

    expect(createAttemptMock).toHaveBeenCalledWith({
      userId: USER_ID,
      quizId: QUIZ_ID,
      score: 3,
      answers: [0, 1, 2],
    });
    expect(trackMock).toHaveBeenCalledWith(
      "quiz_attempt",
      { quizId: QUIZ_ID, score: 3, total: 3 },
      USER_ID,
    );
  });

  it("scores partial answers and marks the wrong ones", async () => {
    const res = await POST(post({ quizId: QUIZ_ID, answers: [0, 0, 0] }));
    const data = await res.json();

    expect(data.score).toBe(1);
    expect(data.results.map((r: { correct: boolean }) => r.correct)).toEqual([
      true,
      false,
      false,
    ]);
    expect(createAttemptMock).toHaveBeenCalledWith(
      expect.objectContaining({ score: 1 }),
    );
  });
});
