"use client";

import { useReactFlow } from "@xyflow/react";

const btn =
  "flex h-10 w-10 items-center justify-center text-ink hover:bg-surface-soft";

export function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <div className="border-ink bg-canvas absolute bottom-6 left-6 z-30 flex flex-col overflow-hidden rounded-md border-2">
      <button
        type="button"
        title="Zoom in"
        className={btn}
        onClick={() => zoomIn({ duration: 150 })}
      >
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 2.5v9M2.5 7h9"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <button
        type="button"
        title="Zoom out"
        className={`${btn} border-ink border-t`}
        onClick={() => zoomOut({ duration: 150 })}
      >
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
          <path
            d="M2.5 7h9"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <button
        type="button"
        title="Fit to view"
        className={`${btn} border-ink border-t`}
        onClick={() => fitView({ padding: 0.2, duration: 200 })}
      >
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
          <rect
            x="2.5"
            y="2.5"
            width="9"
            height="9"
            rx="1"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M7 5v4M5 7h4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
