"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PROVIDER_CATALOG } from "@/lib/ai/catalog";
import { costLabel } from "@/lib/ai/pricing";
import { modelsFor, useAIProvider } from "@/lib/stores/ai-provider";
import { useAiSession } from "@/lib/stores/ai-session";
import { useProgress } from "@/lib/stores/progress";
import { useMounted } from "@/lib/hooks/use-mounted";
import type { GeneratedRoadmapCard } from "@/lib/db/generated";
import { CreateRoadmapPane, ComingSoonPane } from "./CreateRoadmapPane";

/**
 * AI hub (docs/03 §3.3 + AI Hub.dc.html): 268px rail (create modes, My learning,
 * AI-engine chip + session token readout, BYOK note) and the mode pane. Roadmap
 * mode is live; Course plan / Quiz are coming-soon states (items 5/6).
 */

type Mode = "roadmap" | "course" | "quiz";

const MODE_META: Record<Mode, { label: string; icon: React.ReactNode }> = {
  roadmap: { label: "Roadmap", icon: <RoadmapIcon /> },
  course: { label: "Course plan", icon: <CourseIcon /> },
  quiz: { label: "Quiz", icon: <QuizIcon /> },
};

export function AiHub() {
  const [mode, setMode] = useState<Mode>("roadmap");

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-wrap">
      <aside className="border-hairline flex w-full flex-col gap-[26px] p-6 pt-6 md:w-[268px] md:shrink-0 md:border-r md:px-4">
        <Link
          href="/ai/chat"
          className="border-hairline bg-canvas text-ink hover:bg-surface-soft flex h-11 items-center justify-center gap-2 rounded-full border text-[15px] no-underline"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 2v8M2 6h8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          New chat
        </Link>

        <nav className="flex flex-col gap-1" aria-label="Create">
          <RailLabel>Create</RailLabel>
          {(Object.keys(MODE_META) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`flex w-full items-center gap-[11px] rounded-md p-2.5 text-left text-[15px] ${
                mode === m ? "bg-surface-soft font-link" : "font-body-sm"
              }`}
            >
              {MODE_META[m].icon}
              {MODE_META[m].label}
            </button>
          ))}
        </nav>

        <MyLearning />
        <EngineCard />

        <div className="bg-block-lilac mt-auto flex flex-col gap-2.5 rounded-lg p-4">
          <span className="font-mono text-[11px] tracking-[0.5px] uppercase">
            No limits
          </span>
          <span className="font-body-sm text-[14px] leading-[1.45]">
            Generate and chat as much as you like — it runs on your own key. You
            only pay your provider for what you use.
          </span>
          <Link
            href="/settings"
            className="bg-primary text-on-primary font-link flex h-9 w-fit items-center rounded-full px-4 text-[14px] no-underline"
          >
            Manage key
          </Link>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 basis-[480px] flex-col px-6 py-11 md:px-12">
        {mode === "roadmap" ? (
          <CreateRoadmapPane />
        ) : (
          <ComingSoonPane mode={mode} />
        )}
      </main>
    </div>
  );
}

function MyLearning() {
  const { status } = useSession();
  const mounted = useMounted();
  const byRoadmap = useProgress((s) => s.byRoadmap);
  const [items, setItems] = useState<GeneratedRoadmapCard[] | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    fetch("/api/me/library")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items?: GeneratedRoadmapCard[] } | null) => {
        if (active && d?.items) setItems(d.items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [status]);

  if (status !== "authenticated" || !items?.length) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <RailLabel>My learning</RailLabel>
      {items.slice(0, 5).map((item) => {
        const statuses = mounted ? byRoadmap[item.roadmapId] : undefined;
        const done = statuses
          ? Object.values(statuses).filter((s) => s === "done").length
          : 0;
        const pct = item.topicCount
          ? Math.min(100, Math.round((done / item.topicCount) * 100))
          : 0;
        return (
          <Link
            key={item.itemId}
            href={`/ai/roadmap/${item.roadmapId}`}
            className="hover:bg-surface-soft flex flex-col gap-[7px] rounded-md px-2.5 py-[9px] no-underline"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-ink truncate text-[15px]">
                {item.title}
              </span>
              <span className="text-ink/60 font-mono text-[11px]">{pct}%</span>
            </span>
            <span className="bg-hairline h-[5px] overflow-hidden rounded-full">
              <span
                className="bg-ink block h-full"
                style={{ width: `${pct}%` }}
              />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function EngineCard() {
  const mounted = useMounted();
  const provider = useAIProvider((s) => s.provider);
  const keys = useAIProvider((s) => s.keys);
  const models = useAIProvider((s) => s.models);
  const inputTokens = useAiSession((s) => s.inputTokens);
  const outputTokens = useAiSession((s) => s.outputTokens);

  if (!mounted) return null;

  const meta = PROVIDER_CATALOG[provider];
  const hasKey = Boolean(keys[provider]?.trim());
  const smart = modelsFor({ models }, provider).smart;
  const total = inputTokens + outputTokens;
  const cost = costLabel(smart, { inputTokens, outputTokens });

  return (
    <div className="border-hairline flex flex-col gap-2.5 rounded-lg border p-3.5">
      <RailLabel>AI engine</RailLabel>
      <div className="flex items-center justify-between gap-2">
        <span className="bg-surface-soft flex items-center gap-[7px] rounded-full px-2.5 py-[5px] font-mono text-[11px] tracking-[0.4px] uppercase">
          <span
            className={`h-1.5 w-1.5 rounded-full ${hasKey ? "bg-success" : "bg-hairline"}`}
          />
          <span className="max-w-[120px] truncate">{smart}</span>
        </span>
        <Link
          href="/settings"
          className="border-ink text-ink border-b-[1.5px] font-mono text-[10px] tracking-[0.4px] uppercase no-underline"
        >
          Change
        </Link>
      </div>
      <span className="text-ink/70 font-mono text-[11px] tracking-[0.2px]">
        {hasKey
          ? `${total.toLocaleString()} tokens this session${cost ? ` · ${cost}` : ""}`
          : `${meta.label} · no key yet`}
      </span>
    </div>
  );
}

function RailLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-ink/55 px-2.5 pb-1 font-mono text-[11px] tracking-[0.6px] uppercase">
      {children}
    </span>
  );
}

function RoadmapIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M8 2l6 3-6 3-6-3 6-3z"
        stroke="var(--color-ink)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M2 8l6 3 6-3M2 11l6 3 6-3"
        stroke="var(--color-ink)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CourseIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x="2.5"
        y="3"
        width="11"
        height="10.5"
        rx="1.5"
        stroke="var(--color-ink)"
        strokeWidth="1.3"
      />
      <path
        d="M2.5 6h11M5.5 1.8v2.4M10.5 1.8v2.4"
        stroke="var(--color-ink)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function QuizIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="8" cy="8" r="6" stroke="var(--color-ink)" strokeWidth="1.3" />
      <circle
        cx="8"
        cy="8"
        r="2.8"
        stroke="var(--color-ink)"
        strokeWidth="1.3"
      />
      <circle cx="8" cy="8" r="0.6" fill="var(--color-ink)" />
    </svg>
  );
}
