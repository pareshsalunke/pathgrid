"use client";

import Link from "next/link";
import { ShareControl } from "./ShareControl";
import type { SaveStatus } from "@/lib/editor/use-autosave";

function StatusPill({
  status,
  issue,
}: {
  status: SaveStatus;
  issue: string | null;
}) {
  const map: Record<SaveStatus, { text: string; tone: string }> = {
    idle: { text: "All changes saved", tone: "text-ink/50" },
    saving: { text: "Saving…", tone: "text-ink/60" },
    saved: { text: "Saved", tone: "text-ink/60" },
    error: { text: "Save failed — retrying", tone: "text-ink" },
    invalid: {
      text: issue ? `Can’t save: ${issue}` : "Can’t save yet",
      tone: "text-ink",
    },
  };
  const { text, tone } = map[status];
  const danger = status === "error" || status === "invalid";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] tracking-[0.3px] ${tone} ${
        danger ? "bg-block-coral" : ""
      }`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          status === "saving"
            ? "bg-ink/40 animate-pulse"
            : danger
              ? "bg-ink"
              : "bg-success"
        }`}
      />
      {text}
    </span>
  );
}

/**
 * Editor top bar (doc 03 §3.5): back to the viewer, inline title edit, autosave
 * state, share. The title input drives the title node's label (persisted with the
 * graph) and a debounced roadmaps.title sync, handled in EditorScreen. `aiAssist` is
 * the AI-assist popover slot (Phase 5 item 2), owned by EditorScreen.
 */
export function EditorTopBar({
  roadmapId,
  title,
  onTitleChange,
  status,
  issue,
  visibility,
  aiAssist,
}: {
  roadmapId: string;
  title: string;
  onTitleChange: (title: string) => void;
  status: SaveStatus;
  issue: string | null;
  visibility: "public" | "unlisted" | "private";
  aiAssist: React.ReactNode;
}) {
  return (
    <header className="border-hairline bg-canvas z-30 flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-5 py-3">
      <Link
        href={`/ai/roadmap/${roadmapId}`}
        className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase no-underline hover:underline"
      >
        ← Done
      </Link>

      <input
        aria-label="Roadmap title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled roadmap"
        className="font-headline text-ink hover:bg-block-cream/60 focus:bg-block-cream/60 min-w-[160px] flex-1 rounded-md bg-transparent px-2 py-1 text-[19px] tracking-[-0.01em] outline-none"
      />

      <StatusPill status={status} issue={issue} />

      {aiAssist}

      <ShareControl roadmapId={roadmapId} initialVisibility={visibility} />
    </header>
  );
}
