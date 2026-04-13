import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { db } from "../lib/db";
import { users, savedSearches } from "../lib/db/schema";
import { pollSavedSearch } from "../lib/poll";

async function main() {
  const [user] = await db.select().from(users).limit(1);
  if (!user) throw new Error("No user");

  const [created] = await db
    .insert(savedSearches)
    .values({
      userId: user.id,
      name: "The Studio",
      channelId: "UCG7J20LhUeLl6y_Emi7OJrA",
      channelTitle: "The Studio",
      channelThumbnail: null,
      keywords: null,
      publishedAfter: "2026-01-01",
      active: true,
    })
    .returning();

  console.log("Created The Studio search. Backfilling…");
  const r = await pollSavedSearch(user.id, created);
  console.log(`Added ${r.newCount} videos`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
