"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function BookmarkButton({ roadmapId }: { roadmapId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  // Load current state client-side so the roadmap page stays statically rendered.
  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    fetch("/api/bookmarks")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { roadmapIds?: string[] } | null) => {
        if (active && d?.roadmapIds) setOn(d.roadmapIds.includes(roadmapId));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [status, roadmapId]);

  async function toggle() {
    if (status !== "authenticated") {
      router.push("/login");
      return;
    }
    const next = !on;
    setOn(next); // optimistic
    setBusy(true);
    const res = await fetch("/api/bookmarks", {
      method: next ? "POST" : "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roadmapId }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) setOn(!next); // revert on failure
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={on ? "Remove bookmark" : "Bookmark"}
      className="border-hairline bg-canvas font-link text-ink hover:bg-surface-soft flex h-9 items-center gap-2 rounded-full border px-4 text-[14px]"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill={on ? "currentColor" : "none"}
      >
        <path
          d="M4 2.5h8V14l-4-2.6L4 14V2.5z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
      {on ? "Saved" : "Save"}
    </button>
  );
}
