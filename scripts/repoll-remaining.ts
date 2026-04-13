import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { db } from "../lib/db";
import { savedSearches } from "../lib/db/schema";
import { pollSavedSearch } from "../lib/poll";
import { eq } from "drizzle-orm";

async function main() {
  const names = ["Dodger games", "MKBHD"];
  for (const name of names) {
    const [s] = await db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.name, name));
    if (!s) continue;
    await db
      .update(savedSearches)
      .set({ lastPolledAt: null })
      .where(eq(savedSearches.id, s.id));
    const refreshed = { ...s, lastPolledAt: null };
    const r = await pollSavedSearch(s.userId, refreshed);
    console.log(`${name}: +${r.newCount} videos`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
