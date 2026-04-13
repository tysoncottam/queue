import { db } from "@/lib/db";
import { videos, videoStates, savedSearches } from "@/lib/db/schema";
import type { VideoStatus } from "@/lib/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export type QueueEntry = {
  video: typeof videos.$inferSelect;
  state: typeof videoStates.$inferSelect;
  savedSearch: { id: string; name: string } | null;
};

export async function getQueueForUser(
  userId: string,
  statuses: VideoStatus[] = ["new", "in_progress"]
): Promise<QueueEntry[]> {
  const rows = await db
    .select({
      video: videos,
      state: videoStates,
      searchId: savedSearches.id,
      searchName: savedSearches.name,
    })
    .from(videoStates)
    .innerJoin(videos, eq(videos.id, videoStates.videoId))
    .leftJoin(savedSearches, eq(savedSearches.id, videoStates.savedSearchId))
    .where(
      and(eq(videoStates.userId, userId), inArray(videoStates.status, statuses))
    )
    .orderBy(desc(videoStates.updatedAt));

  return rows.map((r) => ({
    video: r.video,
    state: r.state,
    savedSearch: r.searchId ? { id: r.searchId, name: r.searchName! } : null,
  }));
}

export async function getSavedSearches(userId: string) {
  return db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, userId))
    .orderBy(desc(savedSearches.createdAt));
}
