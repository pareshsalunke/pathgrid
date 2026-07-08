import { and, eq, sql } from "drizzle-orm";
import { getDb } from "./index";
import { bookmarks, roadmaps, topics } from "./schema";

export async function isBookmarked(
  userId: string,
  roadmapId: string,
): Promise<boolean> {
  const rows = await getDb()
    .select({ roadmapId: bookmarks.roadmapId })
    .from(bookmarks)
    .where(
      and(eq(bookmarks.userId, userId), eq(bookmarks.roadmapId, roadmapId)),
    )
    .limit(1);
  return rows.length > 0;
}

export async function listBookmarkRoadmapIds(
  userId: string,
): Promise<string[]> {
  const rows = await getDb()
    .select({ roadmapId: bookmarks.roadmapId })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId));
  return rows.map((r) => r.roadmapId);
}

export async function addBookmark(
  userId: string,
  roadmapId: string,
): Promise<void> {
  await getDb()
    .insert(bookmarks)
    .values({ userId, roadmapId })
    .onConflictDoNothing();
}

export async function removeBookmark(
  userId: string,
  roadmapId: string,
): Promise<void> {
  await getDb()
    .delete(bookmarks)
    .where(
      and(eq(bookmarks.userId, userId), eq(bookmarks.roadmapId, roadmapId)),
    );
}

export type BookmarkCard = {
  slug: string;
  title: string;
  category: "role" | "skill" | "custom";
  topicCount: number;
};

export async function getBookmarkCards(
  userId: string,
): Promise<BookmarkCard[]> {
  const rows = await getDb()
    .select({
      slug: roadmaps.slug,
      title: roadmaps.title,
      category: roadmaps.category,
      topicCount: sql<number>`count(${topics.id})`.mapWith(Number),
    })
    .from(bookmarks)
    .innerJoin(roadmaps, eq(roadmaps.id, bookmarks.roadmapId))
    .leftJoin(topics, eq(topics.roadmapId, roadmaps.id))
    .where(eq(bookmarks.userId, userId))
    .groupBy(roadmaps.id);
  return rows
    .filter((r): r is typeof r & { slug: string } => Boolean(r.slug))
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      category: r.category,
      topicCount: r.topicCount,
    }));
}
