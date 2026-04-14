import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getQueueForUser } from "@/lib/queries";
import { SearchView } from "@/components/SearchView";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const entries = await getQueueForUser(session.user.id, [
    "new",
    "in_progress",
    "watched",
    "saved_later",
  ]);

  return (
    <AppShell user={session.user}>
      <div className="space-y-5">
        <h1 className="text-large-title">Search</h1>
        <SearchView
          entries={entries.map((e) => ({
            id: e.video.id,
            title: e.video.title,
            channelTitle: e.video.channelTitle,
            thumbnailUrl: e.video.thumbnailUrl ?? "",
            publishedAt: e.video.publishedAt.toISOString(),
            durationSeconds: e.video.durationSeconds,
            status: e.state.status,
          }))}
        />
      </div>
    </AppShell>
  );
}
