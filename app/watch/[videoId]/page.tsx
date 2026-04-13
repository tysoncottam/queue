import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { videos, videoStates } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { WatchShell } from "@/components/WatchShell";
import { getVideosByIds } from "@/lib/youtube";
import { saveMatchedVideos } from "@/lib/poll";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { videoId } = await params;

  let [video] = await db
    .select()
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1);

  if (!video) {
    const [fetched] = await getVideosByIds([videoId]);
    if (!fetched) notFound();
    await saveMatchedVideos(session.user.id, null, [fetched]);
    [video] = await db
      .select()
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);
  }

  if (!video) notFound();

  const [state] = await db
    .select()
    .from(videoStates)
    .where(
      and(
        eq(videoStates.userId, session.user.id),
        eq(videoStates.videoId, videoId)
      )
    )
    .limit(1);

  return (
    <AppShell user={session.user}>
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          ← Back to queue
        </Link>
      </div>
      <WatchShell
        video={{
          id: video.id,
          title: video.title,
          channelTitle: video.channelTitle,
          publishedAt: video.publishedAt.toISOString(),
          description: video.description,
        }}
        startSeconds={state?.progressSeconds ?? 0}
      />
    </AppShell>
  );
}
