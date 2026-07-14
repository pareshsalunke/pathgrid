"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { validateGraph, type RoadmapGraph } from "@/lib/schemas/graph";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "invalid";

/**
 * Debounced autosave for the editor graph. NOT the progress-sync pattern: a
 * whole-graph PATCH is non-commutative, so out-of-order completion would clobber a
 * newer graph with an older one. The last-saved graph lives in STATE, so "dirty" is
 * derived during render — which makes the trailing save fall out for free: a save
 * that lands while newer edits are pending leaves the graph dirty, so the effect
 * re-runs and saves again. An `inFlight` ref keeps at most one request out at a
 * time. Every save is gated on client validateGraph — an invalid transient graph
 * (a delete that disconnects, a cycle) HOLDS with status "invalid" instead of
 * persisting. A beforeunload guard warns when edits are unsaved.
 */
export function useEditorAutosave(
  roadmapId: string,
  graph: RoadmapGraph,
): { status: SaveStatus; issue: string | null } {
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(graph));
  const [saveStatus, setSaveStatus] =
    useState<Exclude<SaveStatus, "invalid">>("idle");
  const inFlight = useRef(false);

  const currentJson = useMemo(() => JSON.stringify(graph), [graph]);
  const validity = useMemo(() => validateGraph(graph), [graph]);
  const isDirty = currentJson !== savedJson;

  const save = useCallback(
    async (payload: RoadmapGraph, json: string) => {
      if (inFlight.current) return; // one request at a time
      inFlight.current = true;
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/editor/${roadmapId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ graph: payload }),
        });
        if (!res.ok) throw new Error(String(res.status));
        setSavedJson(json); // if newer edits exist, isDirty stays true → trailing save
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      } finally {
        inFlight.current = false;
      }
    },
    [roadmapId],
  );

  // Debounce: only a valid, dirty graph schedules a save; invalid transient states hold.
  useEffect(() => {
    if (!isDirty || !validity.success) return;
    const id = setTimeout(() => {
      void save(graph, currentJson);
    }, 700);
    return () => clearTimeout(id);
  }, [isDirty, validity.success, graph, currentJson, save]);

  // Warn before unloading with unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [isDirty]);

  const status: SaveStatus =
    isDirty && !validity.success
      ? "invalid"
      : saveStatus === "error"
        ? "error"
        : isDirty
          ? "saving"
          : saveStatus;
  const issue =
    isDirty && !validity.success
      ? (validity.error.issues[0]?.message ?? "Graph is not valid yet")
      : null;

  return { status, issue };
}
