import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getQueueForUser } from "@/lib/queries";
import { QueueView } from "@/components/QueueView";

export const dynamic = "force-dynamic";

const SORTS = ["newest", "oldest", "channel"] as const;
const VIEWS = ["all", "channels", "categories"] as const;

function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  return (allowed as readonly string[]).includes(value ?? "")
    ? (value as T)
    : fallback;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    view?: string;
    channel?: string;
    category?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const sp = await searchParams;
  const entries = await getQueueForUser(session.user.id, ["new", "in_progress"]);

  return (
    <AppShell user={session.user}>
      <Suspense>
        <QueueView
          entries={entries.map((e) => ({
            id: e.video.id,
            title: e.video.title,
            channelId: e.video.channelId,
            channelTitle: e.video.channelTitle,
            thumbnailUrl: e.video.thumbnailUrl ?? "",
            publishedAt: e.video.publishedAt.toISOString(),
            durationSeconds: e.video.durationSeconds,
            categoryId: e.video.categoryId,
            status: e.state.status,
            progressSeconds: e.state.progressSeconds,
            addedAt: e.state.addedAt.toISOString(),
            savedSearch: e.savedSearch,
          }))}
          initialSort={oneOf(sp.sort, SORTS, "newest")}
          initialView={oneOf(sp.view, VIEWS, "all")}
          initialChannelId={sp.channel ?? null}
          initialCategoryId={sp.category ?? null}
        />
      </Suspense>
    </AppShell>
  );
}
