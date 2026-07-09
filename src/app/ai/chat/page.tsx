import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { listThreads } from "@/lib/db/chat";
import { getRoadmapForChat } from "@/lib/db/roadmaps";
import { ChatScreen, type ChatContext } from "./ChatScreen";

/**
 * New-chat page (docs/03 §2 /ai/chat). Auth-gated RSC (viewer precedent):
 * thread rail + optional grounding from ?roadmap= (deep links from the topic
 * drawer carry ?roadmap&topic&q). Full-height chat pane per Tutor Chat.dc.html —
 * deliberately no footer. Context itself is re-validated server-side on every
 * POST; the params here only shape the UI.
 */

export const metadata: Metadata = {
  title: "Tutor chat",
  robots: { index: false }, // private surface — never indexable
};

type Search = { roadmap?: string; topic?: string; q?: string };

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    const qs = new URLSearchParams();
    for (const key of ["roadmap", "topic", "q"] as const) {
      if (typeof sp[key] === "string") qs.set(key, sp[key]);
    }
    const self = `/ai/chat${qs.size ? `?${qs.toString()}` : ""}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(self)}`);
  }

  let context: ChatContext | null = null;
  const roadmapParam = z.uuid().safeParse(sp.roadmap);
  if (roadmapParam.success) {
    const rm = await getRoadmapForChat(roadmapParam.data, session.user.id);
    if (rm) {
      context = {
        roadmapId: rm.id,
        title: rm.title,
        href: rm.slug ? `/${rm.slug}` : `/ai/roadmap/${rm.id}`,
      };
    }
  }

  const threads = await listThreads(session.user.id);

  return (
    <div className="bg-canvas text-ink flex h-screen flex-col overflow-hidden">
      <AppHeader className="z-50 shrink-0" />
      <ChatScreen
        threads={threads}
        activeThreadId={null}
        initialMessages={[]}
        context={context}
        prefill={typeof sp.q === "string" ? sp.q : undefined}
        openTopicNodeId={
          context && typeof sp.topic === "string" ? sp.topic : undefined
        }
      />
    </div>
  );
}
