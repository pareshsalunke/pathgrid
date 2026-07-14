"use client";

import type { NodeType } from "@/lib/schemas/graph";

const ADDABLE: {
  type: Exclude<NodeType, "title">;
  label: string;
  hint: string;
}[] = [
  { type: "topic", label: "Topic", hint: "A core thing to learn" },
  { type: "subtopic", label: "Subtopic", hint: "A detail under a topic" },
  { type: "section", label: "Section", hint: "Groups a stage" },
  { type: "label", label: "Label", hint: "A note on the canvas" },
];

/**
 * Left palette (doc 03 §3.5). Clicking adds a node of that type, auto-connected to
 * the currently selected node (or the title node) so the graph stays valid — see
 * addNode in src/lib/editor/graph-ops.ts.
 */
export function NodePalette({
  onAdd,
}: {
  onAdd: (type: Exclude<NodeType, "title">) => void;
}) {
  return (
    <aside className="border-hairline bg-canvas flex w-[168px] shrink-0 flex-col gap-3 border-r p-4">
      <span className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase">
        Add node
      </span>
      <div className="flex flex-col gap-2">
        {ADDABLE.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onAdd(item.type)}
            title={item.hint}
            className="border-ink text-ink hover:bg-block-lilac flex flex-col items-start gap-0.5 rounded-md border-2 px-3 py-2 text-left transition-colors"
          >
            <span className="text-[14px] font-[500]">+ {item.label}</span>
            <span className="text-ink/55 text-[11px]">{item.hint}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
