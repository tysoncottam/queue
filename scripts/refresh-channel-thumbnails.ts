import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { db } from "../lib/db";
import { savedSearches } from "../lib/db/schema";
import { google } from "googleapis";
import { eq } from "drizzle-orm";

async function main() {
  const yt = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
  });

  const rows = await db.select().from(savedSearches);
  if (rows.length === 0) {
    console.log("No saved searches.");
    process.exit(0);
  }

  const ids = Array.from(new Set(rows.map((r) => r.channelId)));
  const res = await yt.channels.list({
    part: ["snippet"],
    id: ids,
  });

  const thumbs = new Map<string, string>();
  for (const c of res.data.items ?? []) {
    if (!c.id) continue;
    const url =
      c.snippet?.thumbnails?.medium?.url ??
      c.snippet?.thumbnails?.default?.url ??
      "";
    thumbs.set(c.id, url);
  }

  for (const r of rows) {
    const next = thumbs.get(r.channelId);
    if (!next || next === r.channelThumbnail) continue;
    await db
      .update(savedSearches)
      .set({ channelThumbnail: next })
      .where(eq(savedSearches.id, r.id));
    console.log(`Updated ${r.name} (${r.channelTitle})`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
