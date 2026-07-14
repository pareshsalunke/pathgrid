"use client";

import { useEffect, useRef, useState } from "react";

type Visibility = "private" | "unlisted";

/**
 * Share-by-link control (doc 03 §3.5). Owners flip private↔unlisted; unlisted maps
 * are viewable by anyone with the link at /ai/roadmap/[id] (never public — that's
 * catalog/sitemap territory). Fires PATCH /api/editor/[id] { visibility }.
 */
export function ShareControl({
  roadmapId,
  initialVisibility,
}: {
  roadmapId: string;
  initialVisibility: "public" | "unlisted" | "private";
}) {
  // A user map is only ever private or unlisted here; treat the rare public as unlisted.
  const [visibility, setVisibility] = useState<Visibility>(
    initialVisibility === "private" ? "private" : "unlisted",
  );
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function setTo(next: Visibility) {
    setBusy(true);
    try {
      const res = await fetch(`/api/editor/${roadmapId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      if (res.ok) setVisibility(next);
    } catch {
      /* keep the old state; the pill still shows the last confirmed value */
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/ai/roadmap/${roadmapId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the link is shown in the field to copy manually */
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border-ink text-ink hover:bg-block-lilac rounded-full border-2 px-4 py-1.5 text-[13px] font-[500] transition-colors"
      >
        {visibility === "unlisted" ? "Shared" : "Share"}
      </button>

      {open && (
        <div className="border-ink bg-canvas absolute right-0 z-50 mt-2 flex w-[264px] flex-col gap-3 rounded-lg border-2 p-4 shadow-[var(--shadow-modal)]">
          <span className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase">
            Share this roadmap
          </span>

          <div className="flex flex-col gap-2">
            <ShareOption
              active={visibility === "private"}
              disabled={busy}
              title="Private"
              desc="Only you can open it."
              onClick={() => setTo("private")}
            />
            <ShareOption
              active={visibility === "unlisted"}
              disabled={busy}
              title="Anyone with the link"
              desc="Not listed or indexed; link-only."
              onClick={() => setTo("unlisted")}
            />
          </div>

          {visibility === "unlisted" && (
            <div className="border-hairline flex items-center gap-2 border-t pt-3">
              <code className="text-ink/70 min-w-0 flex-1 truncate text-[11px]">
                /ai/roadmap/{roadmapId}
              </code>
              <button
                type="button"
                onClick={copyLink}
                className="border-ink text-ink hover:bg-block-lilac shrink-0 rounded-md border px-2.5 py-1 text-[12px]"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShareOption({
  active,
  disabled,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || active}
      className={`flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors ${
        active
          ? "border-ink bg-block-mint"
          : "border-hairline hover:bg-block-lilac disabled:opacity-50"
      }`}
    >
      <span className="text-ink text-[13px] font-[500]">{title}</span>
      <span className="text-ink/55 text-[11px]">{desc}</span>
    </button>
  );
}
