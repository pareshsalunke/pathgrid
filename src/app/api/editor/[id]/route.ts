import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { roadmapGraph } from "@/lib/schemas/graph";
import {
  updateRoadmapGraph,
  setRoadmapVisibility,
  setRoadmapTitle,
} from "@/lib/db/editor";
import { track } from "@/lib/track";

/**
 * Owner-gated editor autosave (doc 04 §4 PATCH /api/editor/[id]). Body carries any
 * of: `graph` (parsed through roadmapGraph, so an invalid graph is a 400 — never
 * stored), `visibility` (private↔unlisted share toggle), `title` (the roadmaps.title
 * column). A write to a map the caller doesn't own returns 404, hiding existence.
 * Not an AI route — no provider key, plain session-cookie auth.
 */

const patchSchema = z
  .object({
    graph: roadmapGraph.optional(),
    visibility: z.enum(["private", "unlisted"]).optional(),
    title: z.string().trim().min(1).max(120).optional(),
  })
  .refine((b) => Boolean(b.graph || b.visibility || b.title), {
    message: "at least one of graph, visibility, title is required",
  });

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const { graph, visibility, title } = parsed.data;

  if (graph) {
    const { ok } = await updateRoadmapGraph({
      roadmapId: id,
      ownerId: userId,
      graph,
    });
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await track(
      "editor_graph_saved",
      { roadmapId: id, nodes: graph.nodes.length },
      userId,
    );
  }

  if (visibility) {
    const { ok } = await setRoadmapVisibility({
      roadmapId: id,
      ownerId: userId,
      visibility,
    });
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await track("editor_visibility_set", { roadmapId: id, visibility }, userId);
  }

  if (title) {
    const { ok } = await setRoadmapTitle({
      roadmapId: id,
      ownerId: userId,
      title,
    });
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await track("editor_title_set", { roadmapId: id }, userId);
  }

  return NextResponse.json({ ok: true });
}
