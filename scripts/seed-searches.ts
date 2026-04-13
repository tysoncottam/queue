import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { db } from "../lib/db";
import { users, savedSearches } from "../lib/db/schema";
import { searchChannels } from "../lib/youtube";
import { pollSavedSearch } from "../lib/poll";
import { eq } from "drizzle-orm";

type Seed = {
  name: string;
  channelQuery: string;
  preferredChannelId?: string;
  keywords?: string;
  publishedAfter?: string;
};

const seeds: Seed[] = [
  {
    name: "Dodger games",
    channelQuery: "MLB",
    preferredChannelId: "UCoLrcjPV5PbUrUyXq5mjc_A", // MLB official
    keywords: "Dodgers",
    publishedAfter: "2026-01-01",
  },
  {
    name: "PGA highlights",
    channelQuery: "PGA TOUR",
    preferredChannelId: "UCtb0Do8NbXfxfwu9EPhZoIw", // PGA TOUR official
    keywords: "highlights",
    publishedAfter: "2026-01-01",
  },
  {
    name: "Bryson DeChambeau",
    channelQuery: "Bryson DeChambeau",
    publishedAfter: "2026-01-01",
  },
  {
    name: "MKBHD",
    channelQuery: "Marques Brownlee",
    preferredChannelId: "UCBJycsmduvYEL83R_U4JriQ", // MKBHD
    publishedAfter: "2026-01-01",
  },
  {
    name: "The Studio",
    channelQuery: "The Studio Apple TV",
    publishedAfter: "2026-01-01",
  },
];

async function main() {
  const [user] = await db.select().from(users).limit(1);
  if (!user) {
    console.error("No user found. Sign in first at http://localhost:3002");
    process.exit(1);
  }
  console.log(`Seeding for ${user.email} (${user.id})\n`);

  for (const seed of seeds) {
    console.log(`→ ${seed.name}`);
    const results = await searchChannels(seed.channelQuery);
    if (results.length === 0) {
      console.log(`  ✗ No channels found for "${seed.channelQuery}"`);
      continue;
    }

    const chosen =
      (seed.preferredChannelId &&
        results.find((r) => r.id === seed.preferredChannelId)) ||
      results[0];

    console.log(`  ✓ Matched: ${chosen.title} (${chosen.id})`);
    if (results.length > 1) {
      console.log(
        `    Other candidates: ${results
          .slice(0, 4)
          .filter((r) => r.id !== chosen.id)
          .map((r) => `${r.title} (${r.id})`)
          .join(", ")}`
      );
    }

    const existing = await db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.name, seed.name));
    if (existing.length > 0) {
      console.log(`    (already exists — skipping insert)`);
      continue;
    }

    const [created] = await db
      .insert(savedSearches)
      .values({
        userId: user.id,
        name: seed.name,
        channelId: chosen.id,
        channelTitle: chosen.title,
        channelThumbnail: chosen.thumbnail,
        keywords: seed.keywords ?? null,
        publishedAfter: seed.publishedAfter ?? null,
        active: true,
      })
      .returning();

    console.log(`    Created. Backfilling…`);
    const result = await pollSavedSearch(user.id, created);
    console.log(`    Added ${result.newCount} videos.\n`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
