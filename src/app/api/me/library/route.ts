import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listGeneratedRoadmaps } from "@/lib/db/generated";

/** GET /api/me/library — the caller's generated items (doc 04 §4). */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json({ items: await listGeneratedRoadmaps(userId) });
}
