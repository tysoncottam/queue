import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { db } from "../lib/db";
import { savedSearches, videos, videoStates } from "../lib/db/schema";
import { pollSavedSearch } from "../lib/poll";
import { and, eq, inArray, lte } from "drizzle-orm";

async function main() {
  // 1. Update PGA search to stricter keyword
  await db
    .update(savedSearches)
    .set({ keywords: "PGA TOUR Highlights", lastPolledAt: null })
    .where(eq(savedSearches.name, "PGA highlights"));
  console.log('PGA search → keyword "PGA TOUR Highlights"');

  // 2. Remove shorts from every user's queue
  const shortIds = await db
    .select({ id: videos.id })
    .from(videos)
    .where(lte(videos.durationSeconds, 60));

  if (shortIds.length > 0) {
    const ids = shortIds.map((v) => v.id);
    const deleted = await db
      .delete(videoStates)
      .where(inArray(videoStates.videoId, ids))
      .returning();
    console.log(`Removed ${deleted.length} short videos from queue`);
  }

  // 3. Re-evaluate each saved search's existing videos against its (new) keyword rule — title only
  const allSearches = await db.select().from(savedSearches);
  for (const s of allSearches) {
    if (!s.keywords) continue;
    const terms = s.keywords
      .split(/[,\n]/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (terms.length === 0) continue;

    const states = await db
      .select({
        userId: videoStates.userId,
        videoId: videoStates.videoId,
        title: videos.title,
      })
      .from(videoStates)
      .innerJoin(videos, eq(videos.id, videoStates.videoId))
      .where(eq(videoStates.savedSearchId, s.id));

    const toRemove = states.filter((st) => {
      const t = st.title.toLowerCase();
      return !terms.some((term) => t.includes(term));
    });

    for (const r of toRemove) {
      await db
        .delete(videoStates)
        .where(
          and(
            eq(videoStates.userId, r.userId),
            eq(videoStates.videoId, r.videoId)
          )
        );
    }
    if (toRemove.length > 0) {
      console.log(`${s.name}: removed ${toRemove.length} title-mismatch videos`);
    }
  }

  // 4. Re-poll PGA search with new rules to pull in legitimate matches
  const [pga] = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.name, "PGA highlights"));
  if (pga) {
    console.log("Re-polling PGA…");
    const r = await pollSavedSearch(pga.userId, pga);
    console.log(`  Added ${r.newCount} matching videos`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
