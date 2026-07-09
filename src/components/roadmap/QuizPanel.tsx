"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { aiRequestHeaders } from "@/lib/ai/headers";
import { currentAiConfig, useAIProvider } from "@/lib/stores/ai-provider";
import { useAiSession } from "@/lib/stores/ai-session";
import { useMounted } from "@/lib/hooks/use-mounted";
import { cn } from "@/lib/utils";
import type { QuizQuestionPublic } from "@/lib/schemas/quiz";

/**
 * Inline "Quiz me" flow (docs/03 §3.2, docs/08 Phase 3 item 6). Mounted over the topic
 * drawer body on both official and generated maps. Gating mirrors CreateRoadmapPane:
 * anon → login CTA, signed-in-no-key → connect-key card, otherwise fetch on the caller's
 * BYOK key. Generates via POST /api/ai/quiz (answers withheld), grades via
 * POST /api/quiz-attempts (answers revealed). The session token meter only counts a real
 * generation — a cache hit costs nothing.
 */

type QuizResult = { correct: boolean; answerIdx: number; why: string };
type Phase = "loading" | "error" | "questions" | "results";

export function QuizPanel({
  roadmapId,
  nodeId,
  title,
  onClose,
}: {
  roadmapId: string;
  nodeId: string;
  title: string;
  onClose: () => void;
}) {
  const mounted = useMounted();
  const { status } = useSession();
  const pathname = usePathname();
  const provider = useAIProvider((s) => s.provider);
  const keys = useAIProvider((s) => s.keys);
  const models = useAIProvider((s) => s.models);
  const addUsage = useAiSession((s) => s.addUsage);

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<QuizQuestionPublic[]>([]);
  const [quizId, setQuizId] = useState("");
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [score, setScore] = useState(0);
  const startedRef = useRef(false);

  const authed = status === "authenticated";
  const config = mounted ? currentAiConfig({ provider, keys, models }) : null;
  const ready = mounted && authed && Boolean(config);

  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;
    void loadQuiz();
    // loadQuiz reads live store state; only the readiness gate should retrigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function loadQuiz() {
    const cfg = currentAiConfig(useAIProvider.getState());
    if (!cfg) return;
    setPhase("loading");
    setError("");
    try {
      const res = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: {
          ...aiRequestHeaders(cfg),
          "content-type": "application/json",
        },
        body: JSON.stringify({ roadmapId, nodeId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        quizId?: string;
        questions?: QuizQuestionPublic[];
        cached?: boolean;
        usage?: { inputTokens: number; outputTokens: number };
      };
      if (!res.ok) {
        setPhase("error");
        setError(errorCopy(data, res.status));
        return;
      }
      if (data.cached === false && data.usage) addUsage(data.usage);
      const qs = data.questions ?? [];
      setQuestions(qs);
      setQuizId(data.quizId ?? "");
      setAnswers(qs.map(() => null));
      setResults([]);
      setScore(0);
      setPhase("questions");
    } catch {
      setPhase("error");
      setError("Couldn't reach the server. Try again.");
    }
  }

  async function check() {
    if (answers.some((a) => a === null)) return;
    setError("");
    try {
      const res = await fetch("/api/quiz-attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quizId, answers }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        score?: number;
        results?: QuizResult[];
      };
      if (!res.ok || !data.results) {
        setError("Couldn't grade the quiz. Try again.");
        return;
      }
      setResults(data.results);
      setScore(data.score ?? 0);
      setPhase("results");
    } catch {
      setError("Couldn't reach the server. Try again.");
    }
  }

  function retake() {
    setAnswers(questions.map(() => null));
    setResults([]);
    setScore(0);
    setError("");
    setPhase("questions");
  }

  const allAnswered = answers.length > 0 && answers.every((a) => a !== null);

  return (
    <div className="bg-canvas absolute inset-0 z-10 flex flex-col">
      {/* Header — back returns to the drawer body, not close the whole drawer. */}
      <div className="border-hairline flex items-center gap-3 border-b px-[22px] py-4">
        <button
          type="button"
          title="Back"
          onClick={onClose}
          className="bg-surface-soft text-ink hover:bg-hairline flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full"
        >
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
            <path
              d="M7.5 2L3.5 6l4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="flex min-w-0 flex-col">
          <span className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase">
            Quiz me
          </span>
          <span className="text-ink truncate text-[15px] font-[640]">
            {title}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-[22px] py-[18px]">
        {!mounted || status === "loading" ? (
          <CenteredNote>Loading…</CenteredNote>
        ) : !authed ? (
          <Gate
            body="Log in to generate a quiz on this topic — your progress stays saved."
            cta="Log in"
            href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
          />
        ) : !config ? (
          <Gate
            body="Connect your API key to generate a quiz — it stays in this browser."
            cta="Connect key"
            href="/settings"
          />
        ) : phase === "loading" ? (
          <CenteredNote>Writing your quiz…</CenteredNote>
        ) : phase === "error" ? (
          <div className="flex flex-col items-start gap-4">
            <div
              role="status"
              className="bg-block-coral text-ink w-full rounded-md px-4 py-3 text-[14px]"
            >
              {error}
            </div>
            <button
              type="button"
              onClick={() => void loadQuiz()}
              className="bg-primary text-on-primary font-link rounded-full px-5 py-2.5 text-[14px]"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {phase === "results" && (
              <div className="border-ink flex items-center justify-between gap-3 rounded-lg border-2 px-4 py-3.5">
                <span className="font-headline text-[20px] tracking-[-0.2px]">
                  You scored {score} / {questions.length}
                </span>
                <span className="text-ink/60 font-mono text-[11px] tracking-[0.5px] uppercase">
                  {score === questions.length ? "Perfect" : "Review below"}
                </span>
              </div>
            )}

            {questions.map((question, qi) => (
              <QuestionCard
                key={qi}
                index={qi}
                question={question}
                selected={answers[qi]}
                result={phase === "results" ? results[qi] : null}
                onSelect={(oi) =>
                  setAnswers((prev) => {
                    const next = [...prev];
                    next[qi] = oi;
                    return next;
                  })
                }
              />
            ))}

            {error && phase === "questions" && (
              <div
                role="status"
                className="bg-block-coral text-ink rounded-md px-4 py-3 text-[14px]"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              {phase === "results" ? (
                <>
                  <button
                    type="button"
                    onClick={retake}
                    className="border-hairline bg-canvas text-ink hover:bg-surface-soft rounded-full border px-5 py-2.5 text-[14px]"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-primary text-on-primary font-link rounded-full px-6 py-2.5 text-[14px]"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <span className="text-ink/55 font-mono text-[11px] tracking-[0.4px] uppercase">
                    {answers.filter((a) => a !== null).length} /{" "}
                    {questions.length} answered
                  </span>
                  <button
                    type="button"
                    onClick={() => void check()}
                    disabled={!allAnswered}
                    className="bg-primary text-on-primary font-link rounded-full px-6 py-2.5 text-[14px] disabled:opacity-50"
                  >
                    Check answers
                  </button>
                </>
              )}
            </div>

            <span className="text-ink/50 font-mono text-[10px] tracking-[0.5px] uppercase">
              AI-generated · review before you rely on it
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionCard({
  index,
  question,
  selected,
  result,
  onSelect,
}: {
  index: number;
  question: QuizQuestionPublic;
  selected: number | null;
  result: QuizResult | null;
  onSelect: (optionIdx: number) => void;
}) {
  const graded = result !== null;
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-ink/60 font-mono text-[11px] tracking-[0.5px] uppercase">
        Question {index + 1}
      </span>
      <p className="text-ink text-[15px] leading-[1.5] font-[540]">
        {question.q}
      </p>
      <div className="flex flex-col gap-2">
        {question.options.map((option, oi) => {
          const isSelected = selected === oi;
          const isCorrect = graded && result.answerIdx === oi;
          const isWrongPick = graded && isSelected && !result.correct;
          return (
            <button
              key={oi}
              type="button"
              disabled={graded}
              aria-pressed={isSelected}
              onClick={() => onSelect(oi)}
              className={cn(
                "flex items-center gap-3 rounded-md border px-3.5 py-2.5 text-left text-[14px] transition-colors",
                isCorrect
                  ? "border-success bg-block-mint text-ink"
                  : isWrongPick
                    ? "border-hairline bg-block-coral text-ink"
                    : isSelected
                      ? "border-ink bg-surface-soft text-ink"
                      : "border-hairline text-ink hover:bg-surface-soft",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]",
                  isSelected || isCorrect
                    ? "border-ink"
                    : "border-hairline text-ink/50",
                )}
              >
                {String.fromCharCode(65 + oi)}
              </span>
              <span className="flex-1">{option}</span>
              {isCorrect && <Mark kind="correct" />}
              {isWrongPick && <Mark kind="wrong" />}
            </button>
          );
        })}
      </div>
      {graded && (
        <p className="text-ink/70 bg-surface-soft rounded-md px-3 py-2 text-[13px] leading-[1.5]">
          {result.why}
        </p>
      )}
    </div>
  );
}

function Mark({ kind }: { kind: "correct" | "wrong" }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {kind === "correct" ? (
        <path
          d="M3 7.4L5.8 10 11 4"
          stroke="var(--color-ink)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M4 4l6 6M10 4l-6 6"
          stroke="var(--color-ink)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function Gate({
  body,
  cta,
  href,
}: {
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="bg-block-lilac flex flex-col gap-3 rounded-lg p-5">
      <span className="font-body-sm text-[15px] leading-[1.45]">{body}</span>
      <Link
        href={href}
        className="bg-primary text-on-primary font-link w-fit rounded-full px-4 py-2 text-[14px] no-underline"
      >
        {cta}
      </Link>
    </div>
  );
}

function CenteredNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-ink/60 flex flex-1 items-center justify-center py-10 text-[14px]">
      {children}
    </div>
  );
}

function errorCopy(
  data: { error?: string; message?: string },
  status: number,
): string {
  if (data.message) return data.message; // route already produced an actionable message
  switch (data.error) {
    case "no_provider_key":
      return "Add your API key in Settings first.";
    case "ai_disabled":
      return "AI is turned off on this instance.";
    case "roadmap_not_found":
    case "topic_not_found":
      return "This topic isn't available for quizzing.";
    default:
      return status === 401
        ? "Your session expired — sign in again."
        : "Couldn't generate a quiz. Try again.";
  }
}
