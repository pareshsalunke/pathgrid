"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { aiRequestHeaders } from "@/lib/ai/headers";
import { readSseEvents } from "@/lib/ai/sse";
import { costLabel } from "@/lib/ai/pricing";
import {
  currentAiConfig,
  modelsFor,
  useAIProvider,
} from "@/lib/stores/ai-provider";
import { useAiSession } from "@/lib/stores/ai-session";
import { useMounted } from "@/lib/hooks/use-mounted";
import type { ChatThreadCard } from "@/lib/db/chat";

/**
 * Tutor chat screen (docs/03 §2 /ai/chat[/threadId], Tutor Chat.dc.html):
 * thread rail · context chip · streaming bubbles · missing-key card · composer
 * with the session token meter. Pages are auth-gated server-side; here only the
 * BYOK key gates sending. On the first reply of a new thread the URL swaps to
 * /ai/chat/{threadId} via history.replaceState (Next syncs it into router state
 * without remounting — router.replace would swap the tree mid-stream).
 */

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type ChatContext = {
  roadmapId: string;
  title: string;
  /** Where the chip's "Change" points: the roadmap page this chat is about. */
  href: string;
};

const MESSAGE_MAX = 4000;

export function ChatScreen({
  threads: initialThreads,
  activeThreadId,
  initialMessages,
  context,
  initialThreadTokens = 0,
  prefill,
  openTopicNodeId,
}: {
  threads: ChatThreadCard[];
  activeThreadId: string | null;
  initialMessages: UiMessage[];
  context: ChatContext | null;
  initialThreadTokens?: number;
  prefill?: string;
  openTopicNodeId?: string;
}) {
  const mounted = useMounted();
  const provider = useAIProvider((s) => s.provider);
  const keys = useAIProvider((s) => s.keys);
  const models = useAIProvider((s) => s.models);
  const addUsage = useAiSession((s) => s.addUsage);
  const sessionIn = useAiSession((s) => s.inputTokens);
  const sessionOut = useAiSession((s) => s.outputTokens);

  const [threads, setThreads] = useState(initialThreads);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState(() => prefill ?? "");
  const [streaming, setStreaming] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [threadTokens, setThreadTokens] = useState(initialThreadTokens);
  const [error, setError] = useState("");
  // The live thread id: null until the first meta event of a new chat. Sends
  // are blocked while streaming, so the render-time value is never stale.
  const [threadId, setThreadId] = useState(activeThreadId);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const config = mounted ? currentAiConfig({ provider, keys, models }) : null;
  const smart = modelsFor({ models }, provider).smart;

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, liveText]);

  async function send() {
    const cfg = currentAiConfig(useAIProvider.getState());
    const text = draft.trim();
    if (!cfg || !text || streaming) return;
    const currentThreadId = threadId;

    setDraft("");
    setError("");
    setMessages((m) => [
      ...m,
      { id: `local-u-${Date.now()}`, role: "user", content: text },
    ]);
    setStreaming(true);
    setLiveText("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          ...aiRequestHeaders(cfg),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          ...(currentThreadId
            ? { threadId: currentThreadId }
            : context
              ? { roadmapId: context.roadmapId }
              : {}),
          ...(openTopicNodeId ? { openTopicNodeId } : {}),
        }),
      });

      if (!res.ok || !res.body) {
        // Pre-stream JSON failure — nothing was persisted; hand the text back.
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setMessages((m) => m.slice(0, -1));
        setDraft(text);
        setError(
          data.error === "no_provider_key"
            ? "Add your API key in Settings first."
            : data.error === "ai_disabled"
              ? "AI is turned off on this instance."
              : data.error === "thread_not_found"
                ? "This chat no longer exists — start a new one."
                : data.error === "roadmap_not_found"
                  ? "That roadmap isn't available to chat about anymore."
                  : res.status === 401
                    ? "Your session expired — sign in again."
                    : "Something went wrong starting the reply. Try again.",
        );
        return;
      }

      let acc = "";
      let finished = false;
      try {
        await readSseEvents(res.body, (event) => {
          if (event.type === "meta") {
            const tid = event.threadId as string;
            const title = (event.title as string) ?? "New chat";
            if (!currentThreadId) {
              setThreadId(tid);
              // Shallow URL swap — no RSC fetch, no remount mid-stream.
              window.history.replaceState(
                window.history.state,
                "",
                `/ai/chat/${tid}`,
              );
              setThreads((t) => [
                {
                  id: tid,
                  title,
                  roadmapId: context?.roadmapId ?? null,
                  roadmapSlug: null,
                  roadmapTitle: context?.title ?? null,
                  lastActivity: new Date().toISOString(),
                },
                ...t,
              ]);
            } else {
              setThreads((t) => {
                const active = t.find((x) => x.id === tid);
                if (!active) return t;
                return [
                  { ...active, lastActivity: new Date().toISOString() },
                  ...t.filter((x) => x.id !== tid),
                ];
              });
            }
          } else if (event.type === "delta") {
            acc += event.text as string;
            setLiveText(acc);
          } else if (event.type === "done") {
            finished = true;
            const usage = event.usage as {
              inputTokens: number;
              outputTokens: number;
            };
            addUsage(usage);
            setThreadTokens((t) => t + usage.inputTokens + usage.outputTokens);
            setMessages((m) => [
              ...m,
              { id: `local-a-${Date.now()}`, role: "assistant", content: acc },
            ]);
          } else if (event.type === "error") {
            finished = true;
            setError(
              typeof event.message === "string"
                ? event.message
                : "The tutor couldn't reply. Try again.",
            );
          }
        });
      } catch {
        // Mid-stream drop: the message is persisted and the server finishes.
        setError(
          "Connection lost mid-reply — your message is saved; reload to see the full answer.",
        );
        return;
      }
      if (!finished) {
        setError(
          "The connection closed early — reload to see the saved reply.",
        );
      }
    } catch {
      // Network failure before any response — nothing was persisted.
      setMessages((m) => m.slice(0, -1));
      setDraft(text);
      setError("Couldn't reach the server. Try again.");
    } finally {
      setStreaming(false);
      setLiveText("");
    }
  }

  const railProps = {
    threads,
    activeThreadId: threadId,
    grouped: mounted,
  };

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col md:flex-row md:overflow-hidden">
      {/* Thread rail (desktop) */}
      <aside className="border-hairline hidden w-[284px] shrink-0 flex-col gap-[18px] overflow-y-auto border-r px-3.5 py-5 md:flex">
        <ThreadRail {...railProps} />
      </aside>

      {/* Thread list (mobile disclosure) */}
      <details className="border-hairline border-b md:hidden">
        <summary className="text-ink/70 cursor-pointer px-[26px] py-2.5 font-mono text-[11px] tracking-[0.6px] uppercase">
          Chats
        </summary>
        <div className="flex flex-col gap-[18px] px-3.5 pb-4">
          <ThreadRail {...railProps} />
        </div>
      </details>

      {/* Chat pane */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="border-hairline flex flex-wrap items-center justify-between gap-3 border-b px-[26px] py-3 md:px-8">
          <div className="flex items-center gap-2.5">
            <span className="bg-block-lilac text-ink flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[11px] tracking-[0.4px] uppercase">
              <GraphIcon />
              {context ? context.title : "General tutor"}
            </span>
            {context && (
              <Link
                href={context.href}
                className="border-ink text-ink border-b-[1.5px] font-mono text-[10px] tracking-[0.4px] uppercase no-underline"
              >
                Change
              </Link>
            )}
          </div>
          <span className="text-ink/55 font-mono text-[10px] tracking-[0.4px] uppercase">
            {context
              ? "Answers cite nodes from this map"
              : "Not grounded in a map — ask anything"}
          </span>
        </div>

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[780px] flex-col gap-[18px] px-[26px] py-7 md:px-8">
            {messages.length === 0 && !streaming && (
              <div className="mt-10 flex flex-col gap-2.5">
                <span className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase">
                  {context ? "Roadmap chat" : "Ask the tutor"}
                </span>
                <h1 className="font-headline text-[28px] tracking-[-0.3px]">
                  {context
                    ? `Ask about ${context.title}`
                    : "One-off questions, any topic"}
                </h1>
                <p className="font-body-sm text-ink/75 max-w-[480px] text-[16px] leading-[1.5]">
                  {context
                    ? "Answers are grounded in this map and your progress — try “what should I work on next?”"
                    : "Quick answers while you learn. Open a chat from a roadmap to ground it in the map."}
                </p>
              </div>
            )}

            {messages.map((m) =>
              m.role === "user" ? (
                <div
                  key={m.id}
                  className="bg-primary text-on-primary max-w-[75%] self-end rounded-[16px_16px_4px_16px] px-4 py-3 text-[15px] leading-[1.55] whitespace-pre-wrap"
                >
                  {m.content}
                </div>
              ) : (
                <div
                  key={m.id}
                  className="border-hairline bg-canvas text-ink max-w-[88%] self-start rounded-[16px_16px_16px_4px] border px-4 py-3.5 text-[15px] leading-[1.65] whitespace-pre-wrap"
                >
                  {m.content}
                </div>
              ),
            )}

            {streaming && (
              <div className="flex max-w-[88%] flex-col gap-2.5 self-start">
                {liveText && (
                  <div className="border-hairline bg-canvas text-ink rounded-[16px_16px_16px_4px] border px-4 py-3.5 text-[15px] leading-[1.65] whitespace-pre-wrap">
                    {liveText}
                    <span
                      className="bg-ink ml-0.5 inline-block h-[15px] w-0.5 animate-pulse align-[-2px]"
                      aria-hidden="true"
                    />
                  </div>
                )}
                <div
                  className="flex items-center gap-1.5 pl-0.5"
                  role="status"
                  aria-live="polite"
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="bg-ink h-[5px] w-[5px] animate-pulse rounded-full"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                  <span className="text-ink/55 pl-1 font-mono text-[10px] tracking-[0.4px] uppercase">
                    Writing…
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div
                role="status"
                className="bg-block-coral text-ink max-w-[88%] self-start rounded-md px-4 py-3 text-[14px]"
              >
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="border-hairline shrink-0 border-t px-[26px] pt-4 pb-5 md:px-8">
          <div className="mx-auto flex w-full max-w-[780px] flex-col gap-2.5">
            {mounted && !config && (
              <div className="bg-block-lilac flex flex-wrap items-center gap-4 rounded-lg px-5 py-[18px]">
                <div className="flex min-w-[240px] flex-1 flex-col gap-1">
                  <span className="text-[16px] font-medium">
                    Add an AI key to start chatting
                  </span>
                  <span className="font-body-sm text-[14px] leading-[1.45]">
                    The tutor uses your own provider key. It stays in this
                    browser — we never see it.
                  </span>
                </div>
                <Link
                  href="/settings"
                  className="bg-primary text-on-primary font-link flex h-10 shrink-0 items-center rounded-full px-[18px] text-[15px] no-underline"
                >
                  Open settings
                </Link>
              </div>
            )}

            <form
              className={`border-hairline flex items-center gap-2.5 rounded-full border py-1.5 pr-1.5 pl-[18px] ${
                mounted && !config ? "opacity-45" : ""
              }`}
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={MESSAGE_MAX}
                disabled={!config}
                placeholder={
                  context ? "Ask about this roadmap…" : "Ask the tutor…"
                }
                aria-label="Message the tutor"
                className="text-ink placeholder:text-ink/50 min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none"
              />
              <button
                type="submit"
                aria-label="Send"
                disabled={!config || streaming || !draft.trim()}
                className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M7 11.5v-9M3.5 6L7 2.5 10.5 6"
                    stroke="var(--color-on-primary)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </form>

            <div className="text-ink/60 flex flex-wrap items-center justify-between gap-2 px-1.5 font-mono text-[10px] tracking-[0.4px] uppercase">
              <span>
                {mounted
                  ? meterLabel({
                      sessionIn,
                      sessionOut,
                      threadTokens,
                      model: smart,
                    })
                  : "—"}
              </span>
              <span>Answers can be wrong — check the sources</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function meterLabel({
  sessionIn,
  sessionOut,
  threadTokens,
  model,
}: {
  sessionIn: number;
  sessionOut: number;
  threadTokens: number;
  model: string;
}): string {
  const total = sessionIn + sessionOut;
  const cost = costLabel(model, {
    inputTokens: sessionIn,
    outputTokens: sessionOut,
  });
  const parts = [
    `${total.toLocaleString()} tokens this session`,
    ...(cost ? [cost] : []),
    model,
  ];
  if (threadTokens > 0)
    parts.push(`${threadTokens.toLocaleString()} in this thread`);
  return parts.join(" · ");
}

function ThreadRail({
  threads,
  activeThreadId,
  grouped,
}: {
  threads: ChatThreadCard[];
  activeThreadId: string | null;
  grouped: boolean;
}) {
  // Group only after mount — "today" is a client-timezone question and must not
  // differ between the SSR pass and hydration.
  const groups = grouped
    ? splitByToday(threads)
    : [{ label: "Chats", items: threads }];

  return (
    <nav aria-label="Chat threads" className="flex flex-col gap-[18px]">
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

      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <div key={g.label} className="flex flex-col gap-[5px]">
              <span className="text-ink/55 px-2.5 pb-1 font-mono text-[11px] tracking-[0.6px] uppercase">
                {g.label}
              </span>
              {g.items.map((t) => (
                <Link
                  key={t.id}
                  href={`/ai/chat/${t.id}`}
                  aria-current={t.id === activeThreadId ? "page" : undefined}
                  className={`flex flex-col gap-[5px] rounded-md px-3 py-[11px] no-underline ${
                    t.id === activeThreadId
                      ? "bg-surface-soft"
                      : "hover:bg-surface-soft"
                  }`}
                >
                  <span className="text-ink truncate text-[15px]">
                    {t.title ?? "New chat"}
                  </span>
                  <span className="text-ink/55 font-mono text-[10px] tracking-[0.3px]">
                    {t.roadmapTitle ?? "General tutor"}
                    {grouped ? ` · ${timeLabel(t.lastActivity)}` : ""}
                  </span>
                </Link>
              ))}
            </div>
          ),
      )}
    </nav>
  );
}

function splitByToday(
  threads: ChatThreadCard[],
): { label: string; items: ChatThreadCard[] }[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = threads.filter((t) => new Date(t.lastActivity) >= startOfToday);
  const earlier = threads.filter(
    (t) => new Date(t.lastActivity) < startOfToday,
  );
  return [
    { label: "Today", items: today },
    { label: "Earlier", items: earlier },
  ];
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return d >= startOfToday
    ? d
        .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        .toLowerCase()
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function GraphIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="3" cy="9" r="1.4" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="9" cy="9" r="1.4" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6" cy="3" r="1.4" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M6 4.4L3.7 7.6M6 4.4l2.3 3.2"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
