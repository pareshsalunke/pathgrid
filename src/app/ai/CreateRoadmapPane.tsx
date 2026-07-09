"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { RoadmapCanvas } from "@/components/roadmap/RoadmapCanvas";
import { aiRequestHeaders } from "@/lib/ai/headers";
import { readSseEvents } from "@/lib/ai/sse";
import { currentAiConfig, useAIProvider } from "@/lib/stores/ai-provider";
import { useAiSession } from "@/lib/stores/ai-session";
import { useMounted } from "@/lib/hooks/use-mounted";
import { NODE_SIZE, type PositionedNode } from "@/lib/node-size";
import type { RoadmapGraph } from "@/lib/schemas/graph";

/**
 * Create-roadmap pane (docs/03 §3.3 + AI Hub.dc.html): empty form → SSE stepper →
 * saved result with canvas preview. Gating per docs/03 §5: anonymous → login CTA
 * (callbackUrl back here), signed-in-no-key → connect-key card → Settings.
 * Cancel aborts the fetch only — the server finishes and saves to the library.
 */

type Level = "beginner" | "intermediate" | "advanced";
type Pane = "empty" | "generating" | "result";

const LEVELS: { value: Level; label: string }[] = [
  { value: "beginner", label: "New to it" },
  { value: "intermediate", label: "Some" },
  { value: "advanced", label: "Deep" },
];
const HOURS_CYCLE = [3, 5, 10];
const EXAMPLES = [
  "Growth product management",
  "Ship an iOS app",
  "Postgres in production",
];
const STEPS = [
  { label: "Outline drafted", sub: "Stages and topics, ordered by dependency" },
  {
    label: "Building the graph",
    sub: "Linking prerequisites and optional branches",
  },
  { label: "Layout & saving", sub: "Placing nodes, saving to your library" },
];
// SSE step → stepper index (layout + save share the last design step).
const STEP_INDEX: Record<string, number> = {
  outline: 0,
  graphify: 1,
  layout: 2,
  save: 2,
};

type Result = {
  roadmapId: string;
  title: string;
  graph: RoadmapGraph;
  usage: { inputTokens: number; outputTokens: number };
};

export function CreateRoadmapPane() {
  const mounted = useMounted();
  const { status } = useSession();
  const searchParams = useSearchParams();
  const provider = useAIProvider((s) => s.provider);
  const keys = useAIProvider((s) => s.keys);
  const models = useAIProvider((s) => s.models);
  const addUsage = useAiSession((s) => s.addUsage);

  const [goal, setGoal] = useState(() => searchParams.get("goal") ?? "");
  const [level, setLevel] = useState<Level>("beginner");
  const [hours, setHours] = useState(5);
  const [pane, setPane] = useState<Pane>("empty");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const authed = status === "authenticated";
  const config = mounted ? currentAiConfig({ provider, keys, models }) : null;

  async function generate() {
    const cfg = currentAiConfig(useAIProvider.getState());
    if (!cfg) return;
    setError("");
    setStep(0);
    setPane("generating");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/roadmap", {
        method: "POST",
        headers: {
          ...aiRequestHeaders(cfg),
          "content-type": "application/json",
        },
        body: JSON.stringify({ goal: goal.trim(), level, hoursPerWeek: hours }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setPane("empty");
        setError(
          data.error === "no_provider_key"
            ? "Add your API key in Settings first."
            : data.error === "ai_disabled"
              ? "AI is turned off on this instance."
              : data.error === "generation_in_progress"
                ? "A roadmap is already generating. Wait for it to finish, then try again."
                : res.status === 401
                  ? "Your session expired — sign in again."
                  : "Something went wrong starting the generation. Try again.",
        );
        return;
      }

      let finished = false;
      await readSseEvents(res.body, (event) => {
        if (event.type === "progress" && typeof event.step === "string") {
          setStep(STEP_INDEX[event.step] ?? 0);
        } else if (event.type === "done") {
          finished = true;
          const usage = event.usage as Result["usage"];
          addUsage(usage);
          setResult({
            roadmapId: event.roadmapId as string,
            title: event.title as string,
            graph: event.graph as RoadmapGraph,
            usage,
          });
          setPane("result");
        } else if (event.type === "error") {
          finished = true;
          setPane("empty");
          setError(
            typeof event.message === "string"
              ? event.message
              : "Generation failed. Try again.",
          );
        }
      });
      // Stream closed without a terminal event (connection drop).
      if (!finished) {
        setPane("empty");
        setError(
          "The connection dropped mid-generation — check your library in a minute; it may have finished anyway.",
        );
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setPane("empty"); // user cancelled — server still finishes + saves
      } else {
        setPane("empty");
        setError("Couldn't reach the server. Try again.");
      }
    } finally {
      abortRef.current = null;
    }
  }

  if (pane === "generating") {
    return (
      <GeneratingPane
        goal={goal}
        step={step}
        onCancel={() => abortRef.current?.abort()}
      />
    );
  }

  if (pane === "result" && result) {
    return (
      <ResultPane
        result={result}
        onRegenerate={() => {
          setResult(null);
          void generate();
        }}
      />
    );
  }

  return (
    <div className="mx-auto mt-6 flex w-full max-w-[660px] flex-col gap-[26px]">
      <div className="flex flex-col gap-3">
        <span className="font-mono text-[13px] tracking-[0.6px] uppercase">
          New roadmap
        </span>
        <h1 className="font-display text-[clamp(32px,4vw,48px)] leading-[1.05] tracking-[-0.02em]">
          Describe what you want to learn
        </h1>
        <p className="font-body-sm text-ink/80 max-w-[520px] text-[18px] leading-[1.5]">
          A goal works better than a keyword. You&apos;ll get a map you can
          edit, track and hand to the tutor.
        </p>
      </div>

      <div className="border-ink flex flex-col gap-4 rounded-lg border-2 p-[22px]">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="ai-goal"
            className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase"
          >
            Your goal
          </label>
          <textarea
            id="ai-goal"
            rows={2}
            value={goal}
            onChange={(e) => {
              setGoal(e.target.value);
              setError("");
            }}
            placeholder="e.g. move from customer support into product management"
            className="border-hairline bg-canvas text-ink focus:border-ink w-full resize-none rounded-md border px-3.5 py-3 text-[17px] leading-[1.5] outline-none focus:shadow-[0_0_0_1px_var(--color-ink)]"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex min-w-[230px] flex-1 flex-col gap-2">
            <span className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase">
              Your level
            </span>
            <div className="bg-surface-soft flex gap-0.5 rounded-full p-[3px]">
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  aria-pressed={level === l.value}
                  onClick={() => setLevel(l.value)}
                  className={`flex-1 rounded-full px-1 py-2 text-center text-[13px] ${
                    level === l.value
                      ? "bg-primary text-on-primary font-link"
                      : "text-ink font-body-sm"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex w-[170px] flex-col gap-2">
            <span className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase">
              Weekly time
            </span>
            <button
              type="button"
              onClick={() =>
                setHours(
                  HOURS_CYCLE[
                    (HOURS_CYCLE.indexOf(hours) + 1) % HOURS_CYCLE.length
                  ] ?? 5,
                )
              }
              className="border-hairline bg-canvas text-ink hover:bg-surface-soft flex items-center justify-between rounded-md border px-3 py-2.5 text-[15px]"
            >
              {hours} hours
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 3.5l3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-ink/60 font-mono text-[11px] tracking-[0.5px] uppercase">
            Runs on your key · no daily limit
          </span>
          {!mounted || status === "loading" ? (
            <span className="bg-primary text-on-primary font-link rounded-full px-6 py-3 text-[16px] opacity-60">
              Generate roadmap
            </span>
          ) : !authed ? (
            <Link
              href="/login?callbackUrl=%2Fai"
              className="bg-primary text-on-primary font-link rounded-full px-6 py-3 text-[16px] no-underline"
            >
              Log in to generate
            </Link>
          ) : !config ? null : (
            <button
              type="button"
              onClick={() => void generate()}
              disabled={goal.trim().length < 4}
              className="bg-primary text-on-primary font-link rounded-full px-6 py-3 text-[16px] disabled:opacity-50"
            >
              Generate roadmap
            </button>
          )}
        </div>

        {mounted && authed && !config && (
          <div className="bg-block-lilac flex flex-wrap items-center justify-between gap-3 rounded-md px-4 py-3.5">
            <span className="font-body-sm text-[15px]">
              Connect your API key to start generating — it stays in this
              browser.
            </span>
            <Link
              href="/settings"
              className="bg-primary text-on-primary font-link rounded-full px-4 py-2 text-[14px] no-underline"
            >
              Connect key
            </Link>
          </div>
        )}

        {error && (
          <div
            role="status"
            className="bg-block-coral text-ink rounded-md px-4 py-3 text-[14px]"
          >
            {error}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink/50 font-mono text-[11px] tracking-[0.5px] uppercase">
          Try
        </span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setGoal(ex)}
            className="border-hairline bg-canvas text-ink hover:bg-surface-soft rounded-full border px-3.5 py-[7px] text-[14px]"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

function GeneratingPane({
  goal,
  step,
  onCancel,
}: {
  goal: string;
  step: number;
  onCancel: () => void;
}) {
  return (
    <div className="mx-auto mt-10 flex w-full max-w-[580px] flex-col gap-[30px]">
      <div className="flex flex-col gap-2.5">
        <span className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase">
          Generating from your goal
        </span>
        <div className="border-ink rounded-md border-2 px-4 py-3.5 text-[16px] leading-[1.5]">
          &ldquo;{goal}&rdquo;
        </div>
      </div>

      <div className="flex flex-col" role="status" aria-live="polite">
        {STEPS.map((s, i) => {
          const state = i < step ? "done" : i === step ? "active" : "pending";
          return (
            <div key={s.label} className="flex items-start gap-3.5">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    state === "done"
                      ? "bg-primary"
                      : state === "active"
                        ? "border-ink border-2"
                        : "border-hairline border-2"
                  }`}
                >
                  {state === "done" && (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2 6.4L4.7 9 10 3.4"
                        stroke="var(--color-on-primary)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {state === "active" && (
                    <span className="bg-ink h-2 w-2 animate-pulse rounded-full" />
                  )}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="bg-hairline h-[30px] w-0.5" />
                )}
              </div>
              <div
                className={`flex flex-col gap-0.5 pt-0.5 ${state === "pending" ? "opacity-50" : ""}`}
              >
                <span className="font-link text-[16px]">{s.label}</span>
                <span className="text-ink/60 text-[13px]">{s.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-ink/70 text-[14px]">
          Usually under a minute. You can leave — it&apos;ll be in your library.
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="border-hairline bg-canvas text-ink hover:bg-surface-soft shrink-0 rounded-full border px-4 py-2 text-[14px]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ResultPane({
  result,
  onRegenerate,
}: {
  result: Result;
  onRegenerate: () => void;
}) {
  const stageCount = result.graph.nodes.filter(
    (n) => n.type === "section",
  ).length;
  const topicCount = result.graph.nodes.filter(
    (n) => n.type === "topic" || n.type === "subtopic",
  ).length;
  const nodes: PositionedNode[] = result.graph.nodes.map((n) => ({
    ...n,
    position: n.position ?? { x: 0, y: 0 },
    ...NODE_SIZE[n.type],
  }));

  return (
    <div className="mx-auto flex w-full max-w-[780px] flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase">
            Generated just now · saved to your library
          </span>
          <h1 className="font-headline text-[32px] tracking-[-0.4px]">
            {result.title}
          </h1>
          <span className="text-ink/75 text-[15px]">
            {stageCount} stages · {topicCount} topics ·{" "}
            {(
              result.usage.inputTokens + result.usage.outputTokens
            ).toLocaleString()}{" "}
            tokens
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            className="border-hairline bg-canvas text-ink hover:bg-surface-soft rounded-full border px-[18px] py-2.5 text-[15px]"
          >
            Regenerate
          </button>
          <Link
            href={`/ai/roadmap/${result.roadmapId}`}
            className="bg-primary text-on-primary font-link rounded-full px-5 py-2.5 text-[15px] no-underline"
          >
            Open full map
          </Link>
        </div>
      </div>

      <div className="border-ink relative h-[420px] overflow-hidden rounded-lg border-2">
        <RoadmapCanvas
          roadmapId={result.roadmapId}
          nodes={nodes}
          edges={result.graph.edges}
          selectedNodeId={null}
          onSelect={() => {}}
        />
        <span className="bg-canvas/85 text-ink absolute right-3.5 bottom-3 rounded-sm px-2 py-1 font-mono text-[10px] tracking-[0.5px] uppercase">
          Preview — open to track progress
        </span>
      </div>

      <span className="text-ink/55 font-mono text-[10px] tracking-[0.5px] uppercase">
        AI-drafted · review before you rely on it
      </span>
    </div>
  );
}

export function ComingSoonPane({ mode }: { mode: "course" | "quiz" }) {
  const copy =
    mode === "course"
      ? {
          eyebrow: "New course plan",
          heading: "Turn a goal into a weekly plan",
          sub: "Get an ordered, time-boxed schedule — modules and lessons paced to the hours you actually have.",
        }
      : {
          eyebrow: "New quiz",
          heading: "Test what you know",
          sub: "Generate a short quiz on any topic or roadmap — see where the gaps are before you move on.",
        };

  return (
    <div className="mx-auto mt-6 flex w-full max-w-[660px] flex-col gap-5">
      <span className="font-mono text-[13px] tracking-[0.6px] uppercase">
        {copy.eyebrow}
      </span>
      <h1 className="font-display text-[clamp(32px,4vw,48px)] leading-[1.05] tracking-[-0.02em]">
        {copy.heading}
      </h1>
      <p className="font-body-sm text-ink/80 max-w-[520px] text-[18px] leading-[1.5]">
        {copy.sub}
      </p>
      <span className="bg-surface-soft text-ink w-fit rounded-full px-4 py-2 font-mono text-[11px] tracking-[0.5px] uppercase">
        Coming soon
      </span>
    </div>
  );
}
