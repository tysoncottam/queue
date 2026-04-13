import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { google } from "googleapis";

async function main() {
  const yt = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
  });

  const handles = process.argv.slice(2);
  if (handles.length === 0) {
    console.log("Usage: lookup-channel.ts @handle1 @handle2 …");
    process.exit(1);
  }

  for (const handle of handles) {
    const res = await yt.channels.list({
      part: ["snippet", "statistics"],
      forHandle: handle,
    });
    const c = res.data.items?.[0];
    if (!c) {
      console.log(`${handle}: NOT FOUND`);
      continue;
    }
    console.log(
      `${handle} → ${c.snippet?.title} | id=${c.id} | subs=${c.statistics?.subscriberCount}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
