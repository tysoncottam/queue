import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { db } from "../lib/db";
import { videos, videoStates } from "../lib/db/schema";
import { checkIsShort } from "../lib/youtube";
import { eq, inArray, isNull } from "drizzle-orm";

async function main() {
  // Check every video in DB that hasn't been checked yet
  const unchecked = await db
    .select({ id: videos.id })
    .from(videos)
    .where(isNull(videos.isShort));

  console.log(`Checking ${unchecked.length} videos…`);

  const shortIds: string[] = [];
  const batchSize = 10;
  for (let i = 0; i < unchecked.length; i += batchSize) {
    const batch = unchecked.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (v) => [v.id, await checkIsShort(v.id)] as const)
    );
    await Promise.all(
      results.map(([id, isShort]) =>
        db.update(videos).set({ isShort }).where(eq(videos.id, id))
      )
    );
    for (const [id, isShort] of results) {
      if (isShort) shortIds.push(id);
    }
    process.stdout.write(
      `  ${Math.min(i + batchSize, unchecked.length)}/${unchecked.length}\r`
    );
  }
  console.log(`\nFound ${shortIds.length} shorts.`);

  if (shortIds.length > 0) {
    const deleted = await db
      .delete(videoStates)
      .where(inArray(videoStates.videoId, shortIds))
      .returning();
    console.log(`Removed ${deleted.length} short videos from queues.`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
