import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { db } from "../lib/db";
import { savedSearches, videoStates, videos } from "../lib/db/schema";
import { pollSavedSearch } from "../lib/poll";
import { and, eq, notInArray } from "drizzle-orm";

async function main() {
  // 1. Fix PGA search — correct channel is UCKwGZZMrhNYKzucCtTPY2Nw (PGA TOUR official)
  const [pga] = await db
    .update(savedSearches)
    .set({
      channelId: "UCKwGZZMrhNYKzucCtTPY2Nw",
      channelTitle: "PGA TOUR",
      lastPolledAt: null,
    })
    .where(eq(savedSearches.name, "PGA highlights"))
    .returning();
  console.log("Fixed PGA highlights → PGA TOUR");

  // 2. Fix Bryson search — correct channel is UCCxF55adGXOscJ3L8qdKnrQ
  const [bryson] = await db
    .update(savedSearches)
    .set({
      channelId: "UCCxF55adGXOscJ3L8qdKnrQ",
      channelTitle: "Bryson DeChambeau",
      lastPolledAt: null,
    })
    .where(eq(savedSearches.name, "Bryson DeChambeau"))
    .returning();
  console.log("Fixed Bryson DeChambeau");

  // 3. Delete the wrong "The Studio" match + the videos it pulled
  const [studio] = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.name, "The Studio"));

  if (studio) {
    const badStates = await db
      .select({ videoId: videoStates.videoId })
      .from(videoStates)
      .where(eq(videoStates.savedSearchId, studio.id));
    const badIds = badStates.map((s) => s.videoId);

    await db.delete(savedSearches).where(eq(savedSearches.id, studio.id));

    // Only delete videos not referenced by anything else (cascade handles video_state via fk on search delete? No — video_state.savedSearchId is ON DELETE SET NULL)
    // Those video_state rows now have savedSearchId = null. Remove them since the user never wanted them.
    if (badIds.length > 0) {
      await db
        .delete(videoStates)
        .where(
          and(
            eq(videoStates.userId, studio.userId),
            notInArray(videoStates.videoId, [])
          )
        );
    }
    console.log(`Deleted "The Studio" match (${badIds.length} videos removed)`);
  }

  // 4. Clear orphaned bad PGA/Bryson videos — the old savedSearchId-linked ones
  // Simpler: re-poll PGA and Bryson now; old video_states for wrong channels stay but are orphan. They'd show in queue regardless. Let's remove them.
  // Remove any video_state entries for videos whose channel_id doesn't match the current saved search.
  const allEntries = await db
    .select({
      userId: videoStates.userId,
      videoId: videoStates.videoId,
      savedSearchId: videoStates.savedSearchId,
      videoChannelId: videos.channelId,
      searchChannelId: savedSearches.channelId,
    })
    .from(videoStates)
    .innerJoin(videos, eq(videos.id, videoStates.videoId))
    .leftJoin(savedSearches, eq(savedSearches.id, videoStates.savedSearchId));

  let mismatchCount = 0;
  for (const row of allEntries) {
    if (
      row.searchChannelId &&
      row.searchChannelId !== row.videoChannelId
    ) {
      await db
        .delete(videoStates)
        .where(
          and(
            eq(videoStates.userId, row.userId),
            eq(videoStates.videoId, row.videoId)
          )
        );
      mismatchCount++;
    }
  }
  console.log(`Removed ${mismatchCount} orphaned video_state rows`);

  // 5. Backfill PGA and Bryson with correct channels
  console.log("\nBackfilling PGA highlights…");
  const r1 = await pollSavedSearch(pga.userId, pga);
  console.log(`  Added ${r1.newCount} videos`);

  console.log("Backfilling Bryson DeChambeau…");
  const r2 = await pollSavedSearch(bryson.userId, bryson);
  console.log(`  Added ${r2.newCount} videos`);

  console.log("\nDone.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
