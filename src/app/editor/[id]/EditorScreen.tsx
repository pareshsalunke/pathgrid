"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import { AppHeader } from "@/components/layout/AppHeader";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { NodePalette } from "@/components/editor/NodePalette";
import { NodePropertiesPanel } from "@/components/editor/NodePropertiesPanel";
import { EditorTopBar } from "@/components/editor/EditorTopBar";
import { AiAssistPopover } from "@/components/editor/AiAssistPopover";
import { useEditorAutosave } from "@/lib/editor/use-autosave";
import {
  graphToEditor,
  serializeGraph,
  addNode,
  addSubtopics,
  deleteNode,
  changeNodeType,
  renameNode,
  setNodeOptional,
  connectNodes,
  type EditorNode,
  type EditorEdge,
} from "@/lib/editor/graph-ops";
import type { NodeType, RoadmapGraph } from "@/lib/schemas/graph";

/**
 * Client editor island (doc 03 §3.5). React Flow's node/edge arrays are the single
 * source of truth; graph-ops mutates them, serializeGraph turns them back into the
 * domain graph, and useEditorAutosave persists it. Selection is RF-driven (derived
 * from node.selected). Deletion routes through the panel so deleteNode's guards run.
 */
export function EditorScreen({
  roadmapId,
  initialGraph,
  initialTitle,
  initialVisibility,
}: {
  roadmapId: string;
  initialGraph: RoadmapGraph;
  initialTitle: string;
  initialVisibility: "public" | "unlisted" | "private";
}) {
  const initial = useMemo(
    () => graphToEditor(initialGraph, roadmapId),
    [initialGraph, roadmapId],
  );
  const [nodes, setNodes] = useState<EditorNode[]>(initial.nodes);
  const [edges, setEdges] = useState<EditorEdge[]>(initial.edges);
  const meta = initialGraph.meta;

  const graph = useMemo(
    () => serializeGraph(nodes, edges, meta),
    [nodes, edges, meta],
  );
  const { status, issue } = useEditorAutosave(roadmapId, graph);

  const selected = nodes.find((n) => n.selected) ?? null;
  const titleNode = nodes.find((n) => n.data.variant === "title") ?? null;
  const title = titleNode?.data.label ?? initialTitle;

  // ── React Flow change handlers (casts localize the @xyflow generic friction) ──
  const onNodesChange = (changes: NodeChange[]) =>
    setNodes(
      (nds) =>
        applyNodeChanges(
          changes,
          nds as unknown as Node[],
        ) as unknown as EditorNode[],
    );
  const onEdgesChange = (changes: EdgeChange[]) =>
    setEdges(
      (eds) =>
        applyEdgeChanges(
          changes,
          eds as unknown as Edge[],
        ) as unknown as EditorEdge[],
    );
  const onConnect = (c: Connection) => {
    if (!c.source || !c.target) return;
    setEdges((eds) => connectNodes(nodes, eds, c.source, c.target));
  };

  // ── palette / panel actions ──
  const onAdd = (type: Exclude<NodeType, "title">) => {
    const r = addNode(nodes, edges, {
      type,
      anchorId: selected?.id,
      roadmapId,
    });
    setNodes(r.nodes);
    setEdges(r.edges);
  };
  const onRename = (id: string, label: string) =>
    setNodes((nds) => renameNode(nds, id, label));
  const onRetype = (id: string, type: Exclude<NodeType, "title">) =>
    setNodes((nds) => changeNodeType(nds, id, type));
  const onToggleOptional = (id: string, optional: boolean) =>
    setNodes((nds) => setNodeOptional(nds, id, optional));
  const onDelete = (id: string) => {
    const r = deleteNode(nodes, edges, id);
    setNodes(r.nodes);
    setEdges(r.edges);
  };
  const onTitleChange = (label: string) => {
    if (titleNode) setNodes((nds) => renameNode(nds, titleNode.id, label));
  };

  // ── AI assist: insert generated subtopics under the selected node ──
  const selectedForAssist = selected
    ? { id: selected.id, label: selected.data.label }
    : null;
  // Existing children (edge targets from the selected node) so the model won't repeat them.
  const existingChildren = selected
    ? edges
        .filter((e) => e.source === selected.id)
        .map((e) => nodes.find((n) => n.id === e.target)?.data.label)
        .filter((l): l is string => Boolean(l))
    : [];
  const onInsertSubtopics = (parentId: string, labels: string[]) => {
    const r = addSubtopics(nodes, edges, { parentId, labels, roadmapId });
    setNodes(r.nodes);
    setEdges(r.edges);
  };

  // Sync the roadmaps.title column (viewer H1 + library card) — separate from the
  // graph autosave, which persists the title node label + meta.title.
  useTitleSync(roadmapId, title, initialTitle);

  return (
    <div className="bg-canvas text-ink flex h-screen flex-col overflow-hidden">
      <AppHeader />
      <EditorTopBar
        roadmapId={roadmapId}
        title={title}
        onTitleChange={onTitleChange}
        status={status}
        issue={issue}
        visibility={initialVisibility}
        aiAssist={
          <AiAssistPopover
            roadmapTitle={title}
            selected={selectedForAssist}
            existingChildren={existingChildren}
            onInsert={onInsertSubtopics}
          />
        }
      />
      <div className="flex min-h-0 flex-1">
        <NodePalette onAdd={onAdd} />
        <div className="min-w-0 flex-1">
          <EditorCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
          />
        </div>
        <NodePropertiesPanel
          node={selected}
          onRename={onRename}
          onRetype={onRetype}
          onToggleOptional={onToggleOptional}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

function useTitleSync(roadmapId: string, title: string, initialTitle: string) {
  const saved = useRef(initialTitle.trim());

  useEffect(() => {
    const body = title.trim();
    if (!body || body === saved.current) return;
    const id = setTimeout(() => {
      fetch(`/api/editor/${roadmapId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: body }),
      })
        .then((r) => {
          if (r.ok) saved.current = body;
        })
        .catch(() => {});
    }, 800);
    return () => clearTimeout(id);
  }, [title, roadmapId]);
}
