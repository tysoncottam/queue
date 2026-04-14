import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getQueueForUser } from "@/lib/queries";
import { LibraryView } from "@/components/LibraryView";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const saved = await getQueueForUser(session.user.id, ["saved_later"]);
  const watched = await getQueueForUser(session.user.id, ["watched"]);

  return (
    <AppShell user={session.user}>
      <div className="space-y-5">
        <h1 className="text-large-title">Library</h1>
        <LibraryView saved={saved.map(toDTO)} watched={watched.map(toDTO)} />
      </div>
    </AppShell>
  );
}

function toDTO(e: Awaited<ReturnType<typeof getQueueForUser>>[number]) {
  return {
    id: e.video.id,
    title: e.video.title,
    channelTitle: e.video.channelTitle,
    thumbnailUrl: e.video.thumbnailUrl ?? "",
    publishedAt: e.video.publishedAt.toISOString(),
    durationSeconds: e.video.durationSeconds,
    status: e.state.status as
      | "new"
      | "in_progress"
      | "watched"
      | "saved_later"
      | "not_interested",
  };
}
