import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { getRoadmapById } from "@/lib/db/roadmaps";
import { EditorScreen } from "./EditorScreen";

/**
 * Owner-only editor for generated roadmaps (doc 03 §2 /editor/[id]; doc 08 Phase 5).
 * RSC gate — auth() + owner check via getRoadmapById — then hands the stored graph to
 * the client island. Never indexable.
 */
export const metadata: Metadata = {
  title: "Edit roadmap",
  robots: { index: false },
};

type Params = { params: Promise<{ id: string }> };

export default async function EditorPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id)
    redirect(`/login?callbackUrl=${encodeURIComponent(`/editor/${id}`)}`);

  const rm = await getRoadmapById(id, session.user.id);
  if (!rm) notFound();

  return (
    <EditorScreen
      roadmapId={rm.id}
      initialGraph={rm.graph}
      initialTitle={rm.title}
      initialVisibility={rm.visibility}
    />
  );
}
