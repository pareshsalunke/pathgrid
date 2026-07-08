import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { roadmaps, roadmapVersions, topics, resources } from "./schema";
import { validateGraph } from "../schemas/graph";
import { frontendDeveloper } from "./fixtures/frontend-developer";
import { typescript } from "./fixtures/typescript";
import type { RoadmapFixture } from "./fixtures/types";

type DB = ReturnType<typeof getDb>;

const fixtures: RoadmapFixture[] = [frontendDeveloper, typescript];

async function seedOne(db: DB, fx: RoadmapFixture) {
  const parsed = validateGraph(fx.graph);
  if (!parsed.success) {
    throw new Error(
      `Graph invalid for '${fx.slug}':\n` +
        parsed.error.issues.map((i) => `  - ${i.message}`).join("\n"),
    );
  }

  // Idempotent: deleting the roadmap cascades to versions, topics, resources.
  await db.delete(roadmaps).where(eq(roadmaps.slug, fx.slug));

  const [rm] = await db
    .insert(roadmaps)
    .values({
      slug: fx.slug,
      title: fx.title,
      brief: fx.brief,
      category: fx.category,
      seo: fx.seo,
      isAiGenerated: false,
      visibility: "public",
    })
    .returning({ id: roadmaps.id });

  const [ver] = await db
    .insert(roadmapVersions)
    .values({ roadmapId: rm.id, graph: parsed.data, version: 1 })
    .returning({ id: roadmapVersions.id });

  await db
    .update(roadmaps)
    .set({ currentVersionId: ver.id })
    .where(eq(roadmaps.id, rm.id));

  for (const t of fx.topics) {
    const [row] = await db
      .insert(topics)
      .values({
        roadmapId: rm.id,
        nodeId: t.nodeId,
        slug: t.slug,
        title: t.title,
        bodyMd: t.bodyMd,
        meta: t.meta,
      })
      .returning({ id: topics.id });

    if (t.resources?.length) {
      await db.insert(resources).values(
        t.resources.map((r, i) => ({
          topicId: row.id,
          kind: r.kind,
          title: r.title,
          url: r.url,
          isPaid: r.is_paid ?? false,
          position: r.position ?? i,
          status: r.status ?? ("unverified" as const),
        })),
      );
    }
  }

  return fx.topics.length;
}

async function main() {
  const db = getDb();
  for (const fx of fixtures) {
    const topicCount = await seedOne(db, fx);
    console.log(
      `✓ seeded ${fx.slug} — ${fx.graph.nodes.length} nodes, ${topicCount} topics`,
    );
  }
  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
