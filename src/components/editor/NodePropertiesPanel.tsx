"use client";

import type { NodeType } from "@/lib/schemas/graph";
import type { EditorNode } from "@/lib/editor/graph-ops";

const TYPES: Exclude<NodeType, "title">[] = [
  "topic",
  "subtopic",
  "label",
  "section",
];

/**
 * Right properties panel (doc 03 §3.5) — edits graph-level node data only
 * (label / type / optional / delete). The title node can't be retyped or deleted
 * (the single-title invariant is kept by construction). Editing a topic's body_md
 * and resources is a later item (generated maps have no topics rows yet).
 */
export function NodePropertiesPanel({
  node,
  onRename,
  onRetype,
  onToggleOptional,
  onDelete,
}: {
  node: EditorNode | null;
  onRename: (id: string, label: string) => void;
  onRetype: (id: string, type: Exclude<NodeType, "title">) => void;
  onToggleOptional: (id: string, optional: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside className="border-hairline bg-canvas flex w-[280px] shrink-0 flex-col gap-5 border-l p-5">
      <span className="text-ink/60 font-mono text-[11px] tracking-[0.6px] uppercase">
        Properties
      </span>

      {!node ? (
        <p className="text-ink/55 text-[13px] leading-relaxed">
          Select a node to edit it, or add one from the palette.
        </p>
      ) : (
        <NodeFields
          node={node}
          onRename={onRename}
          onRetype={onRetype}
          onToggleOptional={onToggleOptional}
          onDelete={onDelete}
        />
      )}
    </aside>
  );
}

function NodeFields({
  node,
  onRename,
  onRetype,
  onToggleOptional,
  onDelete,
}: {
  node: EditorNode;
  onRename: (id: string, label: string) => void;
  onRetype: (id: string, type: Exclude<NodeType, "title">) => void;
  onToggleOptional: (id: string, optional: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { variant, label, optional } = node.data;
  const isTitle = variant === "title";
  const isContent = variant === "topic" || variant === "subtopic";

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-ink/70 font-mono text-[11px] tracking-[0.4px] uppercase">
          Label
        </span>
        <input
          aria-label="Node label"
          value={label}
          onChange={(e) => onRename(node.id, e.target.value)}
          className="border-hairline focus:border-ink text-ink rounded-md border bg-transparent px-3 py-2 text-[14px] outline-none"
        />
      </label>

      {!isTitle && (
        <label className="flex flex-col gap-1.5">
          <span className="text-ink/70 font-mono text-[11px] tracking-[0.4px] uppercase">
            Type
          </span>
          <select
            aria-label="Node type"
            value={variant}
            onChange={(e) =>
              onRetype(node.id, e.target.value as Exclude<NodeType, "title">)
            }
            className="border-hairline focus:border-ink text-ink rounded-md border bg-transparent px-3 py-2 text-[14px] outline-none"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      )}

      {isContent && (
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={optional ?? false}
            onChange={(e) => onToggleOptional(node.id, e.target.checked)}
            className="accent-ink h-4 w-4"
          />
          <span className="text-ink text-[13px]">
            Optional{" "}
            <span className="text-ink/55">
              — renders dashed / “nice to know”
            </span>
          </span>
        </label>
      )}

      <div className="border-hairline flex flex-col gap-2 border-t pt-4">
        <span className="text-ink/45 font-mono text-[10px] tracking-[0.4px] uppercase">
          Content &amp; resources — coming soon
        </span>
      </div>

      {!isTitle && (
        <button
          type="button"
          onClick={() => onDelete(node.id)}
          className="border-hairline text-ink hover:bg-block-coral mt-1 rounded-md border px-3 py-2 text-[13px] transition-colors"
        >
          Delete node
        </button>
      )}
    </div>
  );
}
