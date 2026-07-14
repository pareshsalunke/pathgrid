"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { aiRequestHeaders } from "@/lib/ai/headers";
import { currentAiConfig, useAIProvider } from "@/lib/stores/ai-provider";
import { useAiSession } from "@/lib/stores/ai-session";
import { useMounted } from "@/lib/hooks/use-mounted";

/**
 * AI-assist popover for the editor top bar (docs/03 §3.5, docs/06 §3.6). Suggests ~5
 * subtopics under the selected node on the caller's BYOK key, then inserts the chosen
 * ones via graph-ops (the parent EditorScreen owns the mutation + autosave). Gating
 * mirrors QuizPanel: anon → login CTA, signed-in-no-key → connect-key card, otherwise
 * fetch on the caller's key. Two-step (generate → review checklist → insert) so AI
 * output is reviewable before it touches the canvas.
 */

type Phase = "idle" | "loading" | "error" | "results";

export function AiAssistPopover({
  roadmapTitle,
  selected,
  existingChildren,
  onInsert,
}: {
  roadmapTitle: string;
  selected: { id: string; label: string } | null;
  existingChildren: string[];
  onInsert: (parentId: string, labels: string[]) => void;
}) {
  const mounted = useMounted();
  const { status } = useSession();
  const pathname = usePathname();
  const provider = useAIProvider((s) => s.provider);
  const keys = useAIProvider((s) => s.keys);
  const models = useAIProvider((s) => s.models);
  const addUsage = useAiSession((s) => s.addUsage);

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const authed = status === "authenticated";
  const config = mounted ? currentAiConfig({ provider, keys, models }) : null;

  // Close on outside click / Escape while open.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setPhase("idle");
    setError("");
    setSuggestions([]);
    setChecked([]);
    setOpen(true);
  }

  async function generate() {
    if (!selected) return;
    const cfg = currentAiConfig(useAIProvider.getState());
    if (!cfg) return;
    setPhase("loading");
    setError("");
    try {
      const res = await fetch("/api/ai/subtopics", {
        method: "POST",
        headers: {
          ...aiRequestHeaders(cfg),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          roadmapTitle,
          parentLabel: selected.label,
          existingChildren,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        subtopics?: string[];
        usage?: { inputTokens: number; outputTokens: number };
      };
      if (!res.ok) {
        setPhase("error");
        setError(errorCopy(data, res.status));
        return;
      }
      if (data.usage) addUsage(data.usage);
      const items = data.subtopics ?? [];
      setSuggestions(items);
      setChecked(items.map(() => true));
      setPhase("results");
    } catch {
      setPhase("error");
      setError("Couldn't reach the server. Try again.");
    }
  }

  function insert() {
    if (!selected) return;
    const chosen = suggestions.filter((_, i) => checked[i]);
    if (chosen.length === 0) return;
    onInsert(selected.id, chosen);
    setOpen(false);
  }

  const chosenCount = checked.filter(Boolean).length;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="border-hairline text-ink hover:bg-block-lilac rounded-full border px-4 py-1.5 text-[13px] transition-colors"
      >
        AI assist
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="AI assist"
          className="border-hairline bg-canvas absolute top-full right-0 z-40 mt-2 w-[320px] rounded-lg border p-4 shadow-lg"
        >
          <span className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase">
            AI assist
          </span>

          <div className="mt-3">
            {!mounted || status === "loading" ? (
              <Note>Loading…</Note>
            ) : !authed ? (
              <Gate
                body="Log in to use AI assist — your work stays saved."
                cta="Log in"
                href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
              />
            ) : !config ? (
              <Gate
                body="Connect your API key to use AI assist — it stays in this browser."
                cta="Connect key"
                href="/settings"
              />
            ) : !selected ? (
              <Note>Select a node first, then add subtopics under it.</Note>
            ) : phase === "loading" ? (
              <Note>Suggesting subtopics…</Note>
            ) : phase === "error" ? (
              <div className="flex flex-col items-start gap-3">
                <div
                  role="status"
                  className="bg-block-coral text-ink w-full rounded-md px-3 py-2.5 text-[13px]"
                >
                  {error}
                </div>
                <button
                  type="button"
                  onClick={() => void generate()}
                  className="bg-primary text-on-primary font-link rounded-full px-4 py-2 text-[13px]"
                >
                  Try again
                </button>
              </div>
            ) : phase === "results" ? (
              <div className="flex flex-col gap-3">
                <p className="text-ink/70 text-[13px] leading-[1.45]">
                  Pick the subtopics to add under{" "}
                  <span className="text-ink font-[560]">{selected.label}</span>:
                </p>
                <ul className="flex flex-col gap-1.5">
                  {suggestions.map((label, i) => (
                    <li key={i}>
                      <label className="hover:bg-surface-soft flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5">
                        <input
                          type="checkbox"
                          aria-label={label}
                          checked={checked[i] ?? false}
                          onChange={(e) =>
                            setChecked((prev) => {
                              const next = [...prev];
                              next[i] = e.target.checked;
                              return next;
                            })
                          }
                          className="accent-ink mt-0.5 h-4 w-4 shrink-0"
                        />
                        <span className="text-ink text-[13px] leading-[1.4]">
                          {label}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void generate()}
                    className="text-ink/60 text-[12px] underline-offset-2 hover:underline"
                  >
                    Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={insert}
                    disabled={chosenCount === 0}
                    className="bg-primary text-on-primary font-link rounded-full px-4 py-2 text-[13px] disabled:opacity-50"
                  >
                    Add {chosenCount} to canvas
                  </button>
                </div>
                <span className="text-ink/50 font-mono text-[10px] tracking-[0.5px] uppercase">
                  AI-generated · review before you rely on it
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-ink/70 text-[13px] leading-[1.45]">
                  Suggest ~5 subtopics under{" "}
                  <span className="text-ink font-[560]">{selected.label}</span>{" "}
                  and add the ones you pick.
                </p>
                <button
                  type="button"
                  onClick={() => void generate()}
                  className="bg-primary text-on-primary font-link w-fit rounded-full px-4 py-2 text-[13px]"
                >
                  Suggest subtopics
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
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
    <div className="bg-block-lilac flex flex-col gap-2.5 rounded-md p-3.5">
      <span className="text-[13px] leading-[1.45]">{body}</span>
      <Link
        href={href}
        className="bg-primary text-on-primary font-link w-fit rounded-full px-3.5 py-1.5 text-[13px] no-underline"
      >
        {cta}
      </Link>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-ink/60 text-[13px] leading-[1.45]">{children}</p>;
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
    default:
      return status === 401
        ? "Your session expired — sign in again."
        : "Couldn't suggest subtopics. Try again.";
  }
}
