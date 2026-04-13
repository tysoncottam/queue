import { db } from "@/lib/db";
import { savedSearches, videoStates, videos } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { checkIsShort, listRecentUploads, type VideoSummary } from "@/lib/youtube";

export type PollResult = {
  searchId: string;
  searchName: string;
  newCount: number;
  skippedCount: number;
};

export async function pollSavedSearch(
  userId: string,
  search: typeof savedSearches.$inferSelect
): Promise<PollResult> {
  const publishedAfter = search.publishedAfter
    ? new Date(search.publishedAfter)
    : undefined;

  const uploads = await listRecentUploads(search.channelId, {
    publishedAfter,
    maxResults: search.lastPolledAt ? 25 : 50,
  });

  const keywordMatched = uploads.filter((v) =>
    matchesKeywords(v, search.keywords)
  );
  const withShortFlags = await annotateShorts(keywordMatched);
  const matched = withShortFlags.filter((v) => !v.isShort);
  const result = await saveMatchedVideos(userId, search.id, matched);

  await db
    .update(savedSearches)
    .set({ lastPolledAt: new Date() })
    .where(eq(savedSearches.id, search.id));

  return {
    searchId: search.id,
    searchName: search.name,
    newCount: result.added,
    skippedCount: result.skipped,
  };
}

export async function pollAllSearchesForUser(
  userId: string
): Promise<PollResult[]> {
  const rows = await db
    .select()
    .from(savedSearches)
    .where(and(eq(savedSearches.userId, userId), eq(savedSearches.active, true)));

  const results: PollResult[] = [];
  for (const s of rows) {
    try {
      results.push(await pollSavedSearch(userId, s));
    } catch (err) {
      console.error("poll failed for search", s.id, err);
      results.push({
        searchId: s.id,
        searchName: s.name,
        newCount: 0,
        skippedCount: 0,
      });
    }
  }
  return results;
}

function matchesKeywords(
  v: VideoSummary,
  keywords: string | null | undefined
): boolean {
  if (!keywords) return true;
  const terms = keywords
    .split(/[,\n]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (terms.length === 0) return true;
  const title = v.title.toLowerCase();
  return terms.some((t) => title.includes(t));
}

type AnnotatedVideo = VideoSummary & { isShort: boolean };

/**
 * Look up each video's short/not-short status, using the DB cache when present
 * and falling back to the HEAD-check against youtube.com/shorts/{id}.
 */
export async function annotateShorts(
  items: VideoSummary[]
): Promise<AnnotatedVideo[]> {
  if (items.length === 0) return [];
  const ids = items.map((i) => i.id);
  const cached = await db
    .select({ id: videos.id, isShort: videos.isShort })
    .from(videos)
    .where(inArray(videos.id, ids));
  const cacheMap = new Map(cached.map((c) => [c.id, c.isShort]));

  const unknowns = items.filter((i) => cacheMap.get(i.id) == null);
  const resolved = await Promise.all(
    unknowns.map(async (v) => [v.id, await checkIsShort(v.id)] as const)
  );
  const resolvedMap = new Map(resolved);

  // Persist newly-learned flags so we don't re-check later
  if (resolvedMap.size > 0) {
    await Promise.all(
      Array.from(resolvedMap.entries()).map(([id, isShort]) =>
        db.update(videos).set({ isShort }).where(eq(videos.id, id))
      )
    );
  }

  return items.map((v) => ({
    ...v,
    isShort: cacheMap.get(v.id) ?? resolvedMap.get(v.id) ?? false,
  }));
}

export async function saveMatchedVideos(
  userId: string,
  savedSearchId: string | null,
  incoming: (VideoSummary & { isShort?: boolean })[]
): Promise<{ added: number; skipped: number }> {
  if (incoming.length === 0) return { added: 0, skipped: 0 };

  const ids = incoming.map((v) => v.id);

  await db
    .insert(videos)
    .values(
      incoming.map((v) => ({
        id: v.id,
        title: v.title,
        channelId: v.channelId,
        channelTitle: v.channelTitle,
        description: v.description,
        thumbnailUrl: v.thumbnailUrl,
        publishedAt: v.publishedAt,
        durationSeconds: v.durationSeconds,
        isShort: v.isShort ?? null,
        categoryId: v.categoryId,
      }))
    )
    .onConflictDoNothing();

  const existingStates = await db
    .select({ videoId: videoStates.videoId, status: videoStates.status })
    .from(videoStates)
    .where(and(eq(videoStates.userId, userId), inArray(videoStates.videoId, ids)));

  const existingIds = new Set(existingStates.map((s) => s.videoId));
  const newEntries = incoming.filter((v) => !existingIds.has(v.id));

  if (newEntries.length > 0) {
    await db.insert(videoStates).values(
      newEntries.map((v) => ({
        userId,
        videoId: v.id,
        savedSearchId,
        status: "new" as const,
      }))
    );
  }

  return {
    added: newEntries.length,
    skipped: incoming.length - newEntries.length,
  };
}
