import { config } from "dotenv";
config({ path: ".env.production.local" });
config({ path: ".env.local" });

import { db } from "../lib/db";
import { users, savedSearches } from "../lib/db/schema";
import { pollSavedSearch } from "../lib/poll";
import { google } from "googleapis";
import { eq } from "drizzle-orm";

type Seed = {
  name: string;
  channelId: string;
  channelTitle: string;
  keywords?: string;
  publishedAfter?: string;
};

const seeds: Seed[] = [
  {
    name: "MrBeast",
    channelId: "UCX6OQ3DkcsbYNE6H8uQQuVA",
    channelTitle: "MrBeast",
    publishedAfter: "2026-01-01",
  },
  {
    name: "Jomboy Media",
    channelId: "UCl9E4Zxa8CVr2LBLD0_TaNg",
    channelTitle: "Jomboy Media",
    publishedAfter: "2026-01-01",
  },
  {
    name: "The Studio",
    channelId: "UCG7J20LhUeLl6y_Emi7OJrA",
    channelTitle: "The Studio",
    publishedAfter: "2026-01-01",
  },
  {
    name: "MKBHD",
    channelId: "UCBJycsmduvYEL83R_U4JriQ",
    channelTitle: "Marques Brownlee",
    publishedAfter: "2026-01-01",
  },
  {
    name: "Bryson DeChambeau",
    channelId: "UCCxF55adGXOscJ3L8qdKnrQ",
    channelTitle: "Bryson DeChambeau",
    publishedAfter: "2026-01-01",
  },
  {
    name: "PGA highlights",
    channelId: "UCKwGZZMrhNYKzucCtTPY2Nw",
    channelTitle: "PGA TOUR",
    keywords: "PGA TOUR Highlights",
    publishedAfter: "2026-01-01",
  },
  {
    name: "Dodger games",
    channelId: "UCoLrcjPV5PbUrUyXq5mjc_A",
    channelTitle: "MLB",
    keywords: "Dodgers",
    publishedAfter: "2026-01-01",
  },
];

async function main() {
  const [user] = await db.select().from(users).limit(1);
  if (!user) {
    console.error("No user in DB");
    process.exit(1);
  }
  console.log(`Seeding for ${user.email} on ${process.env.TURSO_DATABASE_URL}\n`);

  const yt = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
  });
  const detail = await yt.channels.list({
    part: ["snippet"],
    id: seeds.map((s) => s.channelId),
  });
  const thumbs = new Map<string, string>();
  for (const c of detail.data.items ?? []) {
    if (!c.id) continue;
    thumbs.set(
      c.id,
      c.snippet?.thumbnails?.medium?.url ??
        c.snippet?.thumbnails?.default?.url ??
        ""
    );
  }

  for (const s of seeds) {
    const existing = await db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.name, s.name));
    if (existing.length > 0) {
      console.log(`${s.name}: already exists, skipping`);
      continue;
    }

    const [created] = await db
      .insert(savedSearches)
      .values({
        userId: user.id,
        name: s.name,
        channelId: s.channelId,
        channelTitle: s.channelTitle,
        channelThumbnail: thumbs.get(s.channelId) ?? null,
        keywords: s.keywords ?? null,
        publishedAfter: s.publishedAfter ?? null,
        active: true,
      })
      .returning();

    process.stdout.write(`${s.name}: created, backfilling…`);
    const r = await pollSavedSearch(user.id, created);
    console.log(` +${r.newCount}`);
  }

  console.log("\nDone.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
