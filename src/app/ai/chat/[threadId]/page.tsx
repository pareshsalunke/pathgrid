import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import {
  getThreadForOwner,
  listRecentMessages,
  listThreads,
  threadTokenSum,
} from "@/lib/db/chat";
import { ChatScreen, type ChatContext, type UiMessage } from "../ChatScreen";

/**
 * Existing-thread page (docs/03 §2 /ai/chat/[threadId], owner-only). Loads the
 * persisted messages + per-thread token sum server-side; a thread whose roadmap
 * was deleted (SET NULL) renders as general tutor.
 */

export const metadata: Metadata = {
  title: "Tutor chat",
  robots: { index: false }, // private surface — never indexable
};

/** Page load cap — well past the context window; pagination is deferred. */
const PAGE_MESSAGE_CAP = 200;

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const session = await auth();
  if (!session?.user?.id)
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/ai/chat/${threadId}`)}`,
    );

  // Garbage ids 404 instead of erroring in the uuid column comparison.
  if (!z.uuid().safeParse(threadId).success) notFound();

  const thread = await getThreadForOwner(threadId, session.user.id);
  if (!thread) notFound();

  const [messages, threads, threadTokens] = await Promise.all([
    listRecentMessages(threadId, PAGE_MESSAGE_CAP),
    listThreads(session.user.id),
    threadTokenSum(threadId),
  ]);

  const context: ChatContext | null = thread.roadmapId
    ? {
        roadmapId: thread.roadmapId,
        title: thread.roadmapTitle ?? "Roadmap",
        href: thread.roadmapSlug
          ? `/${thread.roadmapSlug}`
          : `/ai/roadmap/${thread.roadmapId}`,
      }
    : null;

  const initialMessages: UiMessage[] = messages.map((m) => ({
    id: String(m.id),
    role: m.role,
    content: m.content,
  }));

  return (
    <div className="bg-canvas text-ink flex h-screen flex-col overflow-hidden">
      <AppHeader className="z-50 shrink-0" />
      <ChatScreen
        threads={threads}
        activeThreadId={thread.id}
        initialMessages={initialMessages}
        context={context}
        initialThreadTokens={threadTokens}
      />
    </div>
  );
}
