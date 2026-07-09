import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";

/**
 * POST /api/revalidate — ISR refresh hook for the pipeline's publish step
 * (docs/05 §3: "revalidation … from the pipeline"; docs/08 Phase 4). Secret-gated via
 * REVALIDATE_SECRET (shared between .env and the Vercel dashboard); with no secret
 * configured the endpoint is disabled. Refreshes home (new catalog card), the roadmap
 * page, and the sitemap.
 */

const bodySchema = z.object({
  secret: z.string().min(1),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(100),
});

function secretMatches(candidate: string): boolean {
  const expected = Buffer.from(env.revalidateSecret);
  const given = Buffer.from(candidate);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function POST(req: Request) {
  if (!env.revalidateSecret)
    return NextResponse.json({ error: "revalidate_disabled" }, { status: 503 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  if (!secretMatches(parsed.data.secret))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  revalidatePath("/");
  revalidatePath(`/${parsed.data.slug}`);
  revalidatePath("/sitemap.xml");
  return NextResponse.json({ ok: true, slug: parsed.data.slug });
}
