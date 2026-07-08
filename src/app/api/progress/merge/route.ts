import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { mergeUserProgress } from "@/lib/db/progress";
import { progressStatus } from "@/lib/schemas/progress";

const mergeSchema = z.object({
  byRoadmap: z.record(z.string(), z.record(z.string(), progressStatus)),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = mergeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  await mergeUserProgress(userId, parsed.data.byRoadmap);
  return NextResponse.json({ ok: true });
}
