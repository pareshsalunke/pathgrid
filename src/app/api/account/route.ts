import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * GDPR delete. A single DELETE on users cascades to progress, bookmarks, accounts,
 * sessions, and owned roadmaps via ON DELETE CASCADE (no app-level transaction needed,
 * which the neon-http driver doesn't support anyway).
 */
export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await getDb().delete(users).where(eq(users.id, userId));
  return NextResponse.json({ ok: true });
}
