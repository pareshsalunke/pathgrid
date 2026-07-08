import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  addBookmark,
  removeBookmark,
  listBookmarkRoadmapIds,
} from "@/lib/db/bookmarks";
import { track } from "@/lib/track";

const bodySchema = z.object({ roadmapId: z.string().min(1) });

async function requireUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({
    roadmapIds: await listBookmarkRoadmapIds(userId),
  });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    await addBookmark(userId, parsed.data.roadmapId);
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 400 });
  }
  await track(
    "bookmark",
    { roadmapId: parsed.data.roadmapId, on: true },
    userId,
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  await removeBookmark(userId, parsed.data.roadmapId);
  await track(
    "bookmark",
    { roadmapId: parsed.data.roadmapId, on: false },
    userId,
  );
  return NextResponse.json({ ok: true });
}
