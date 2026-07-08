import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getUserProgress, putUserProgress } from "@/lib/db/progress";
import { progressStatus } from "@/lib/schemas/progress";
import { track } from "@/lib/track";

const putSchema = z.object({
  statuses: z.record(z.string(), progressStatus),
});

type Ctx = { params: Promise<{ roadmapId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { roadmapId } = await params;
  const statuses = await getUserProgress(userId, roadmapId);
  return NextResponse.json({ statuses });
}

export async function PUT(req: Request, { params }: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { roadmapId } = await params;
  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  await putUserProgress(userId, roadmapId, parsed.data.statuses);
  await track(
    "node_status_set",
    { roadmapId, count: Object.keys(parsed.data.statuses).length },
    userId,
  );
  return NextResponse.json({ ok: true });
}
