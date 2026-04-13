import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { db } from "../lib/db";
import { videos } from "../lib/db/schema";
import { getVideosByIds } from "../lib/youtube";
import { eq, isNull } from "drizzle-orm";

async function main() {
  const rows = await db
    .select({ id: videos.id })
    .from(videos)
    .where(isNull(videos.categoryId));
  console.log(`Backfilling category_id for ${rows.length} videos…`);

  const ids = rows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const fetched = await getVideosByIds(chunk);
    await Promise.all(
      fetched.map((v) =>
        db
          .update(videos)
          .set({ categoryId: v.categoryId })
          .where(eq(videos.id, v.id))
      )
    );
    console.log(`  ${Math.min(i + 50, ids.length)}/${ids.length}`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
