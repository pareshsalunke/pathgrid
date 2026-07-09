"use client";

import { useState } from "react";
import Link from "next/link";
import { useProgress } from "@/lib/stores/progress";
import { cn } from "@/lib/utils";
import type { ProgressStatus } from "@/lib/schemas/progress";
import type { ResourceKind } from "@/lib/schemas/content";
import type { DrawerTopic } from "./types";
import { QuizPanel } from "./QuizPanel";

const STATUSES: { value: ProgressStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "learning", label: "Learning" },
  { value: "done", label: "Done" },
  { value: "skipped", label: "Skip" },
];

const RESOURCE_TILE: Record<ResourceKind, string> = {
  article: "bg-block-lilac",
  video: "bg-block-coral",
  course: "bg-block-mint",
  docs: "bg-block-cream",
  book: "bg-surface-soft",
};

export function TopicDrawer({
  roadmapId,
  topic,
  onClose,
}: {
  roadmapId: string;
  topic: DrawerTopic;
  onClose: () => void;
}) {
  const status =
    useProgress((s) => s.byRoadmap[roadmapId]?.[topic.nodeId]) ?? "pending";
  const setStatus = useProgress((s) => s.setStatus);
  const [quizOpen, setQuizOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="bg-ink/50 absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="border-ink bg-canvas shadow-modal absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col overflow-hidden rounded-t-2xl border-2 sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[420px] sm:max-w-[calc(100%-2rem)] sm:rounded-2xl sm:rounded-r-none"
        role="dialog"
        aria-label={topic.title}
      >
        {/* Header */}
        <div className="border-hairline flex flex-col gap-3.5 border-b px-[22px] pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-[5px]">
              <span className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase">
                {topic.eyebrow}
              </span>
              <h2 className="text-ink text-[22px] font-[700] tracking-[-0.2px]">
                {topic.title}
              </h2>
            </div>
            <button
              type="button"
              title="Close"
              onClick={onClose}
              className="bg-surface-soft text-ink hover:bg-hairline flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 2l8 8M10 2l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="bg-surface-soft flex gap-0.5 rounded-full p-[3px]">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(roadmapId, topic.nodeId, s.value)}
                className={cn(
                  "flex-1 rounded-full px-1 py-2 text-[13px] transition-colors",
                  status === s.value
                    ? "bg-primary font-link text-on-primary"
                    : "font-body-sm text-ink hover:bg-hairline",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-[22px] py-[18px]">
          <div
            className="font-body-sm text-ink [&_code]:bg-surface-soft text-[15px] leading-[1.6] [&_a]:underline [&_code]:rounded-xs [&_code]:px-1 [&_code]:font-mono [&_code]:text-[13px] [&_li]:mb-1 [&_p]:mb-3 [&_strong]:font-[540] [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: topic.bodyHtml }}
          />

          {topic.resources.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <span className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase">
                Resources
              </span>
              {topic.resources.map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-hairline hover:bg-surface-soft flex items-center gap-3 rounded-md border px-3 py-2.5 no-underline"
                >
                  <span
                    className={cn(
                      "text-ink shrink-0 rounded-sm px-[7px] py-[3px] font-mono text-[9.5px] tracking-[0.5px] uppercase",
                      RESOURCE_TILE[r.kind],
                    )}
                  >
                    {r.kind}
                  </span>
                  <span className="font-body-sm text-ink flex-1 text-[14px]">
                    {r.title}
                  </span>
                  <span className="text-ink/50 font-mono text-[11px]">
                    {r.domain}
                  </span>
                </a>
              ))}
              <span className="text-ink/50 font-mono text-[10px] tracking-[0.5px] uppercase">
                Resource list: AI-drafted · human-reviewed
              </span>
            </div>
          )}
        </div>

        {/* Footer — AI row (docs/03 §3.2). "Quiz me" runs inline (item 6); the two chat
            entries deep-link into the tutor with this map + topic as context
            (?q= prefills the composer, never auto-sends). */}
        <div className="border-hairline flex flex-col gap-2 border-t px-[22px] py-3.5">
          <button
            type="button"
            onClick={() => setQuizOpen(true)}
            className="bg-primary font-link text-on-primary rounded-full px-4 py-3 text-center text-[14px]"
          >
            Quiz me
          </button>
          <div className="flex gap-2">
            <Link
              href={`/ai/chat?roadmap=${roadmapId}&topic=${encodeURIComponent(topic.nodeId)}&q=${encodeURIComponent("Explain this topic")}`}
              className="border-hairline bg-canvas font-link text-ink hover:bg-surface-soft flex-1 rounded-full border px-4 py-3 text-center text-[14px] no-underline"
            >
              Explain this topic
            </Link>
            <Link
              href={`/ai/chat?roadmap=${roadmapId}&topic=${encodeURIComponent(topic.nodeId)}`}
              className="border-hairline bg-canvas font-link text-ink hover:bg-surface-soft flex-1 rounded-full border px-4 py-3 text-center text-[14px] no-underline"
            >
              Ask the tutor
            </Link>
          </div>
        </div>

        {quizOpen && (
          <QuizPanel
            roadmapId={roadmapId}
            nodeId={topic.nodeId}
            title={topic.title}
            onClose={() => setQuizOpen(false)}
          />
        )}
      </aside>
    </div>
  );
}
