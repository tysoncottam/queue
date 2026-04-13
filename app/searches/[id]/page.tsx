import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { savedSearches } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { EditSearchForm } from "@/components/EditSearchForm";

export const dynamic = "force-dynamic";

export default async function EditSearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const { id } = await params;

  const [search] = await db
    .select()
    .from(savedSearches)
    .where(
      and(eq(savedSearches.id, id), eq(savedSearches.userId, session.user.id))
    )
    .limit(1);

  if (!search) notFound();

  return (
    <AppShell user={session.user}>
      <div className="mx-auto max-w-xl">
        <Link
          href="/searches"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          ← All searches
        </Link>
        <div className="mb-6">
          <h1 className="text-lg font-semibold">Edit search</h1>
          <p className="mt-1 text-sm text-muted">
            Change the name, keywords, or date. The channel can&rsquo;t be
            changed — delete and create a new one if you want a different
            channel.
          </p>
        </div>
        <EditSearchForm
          search={{
            id: search.id,
            name: search.name,
            channelTitle: search.channelTitle,
            channelThumbnail: search.channelThumbnail,
            keywords: search.keywords,
            publishedAfter: search.publishedAfter,
            active: search.active,
          }}
        />
      </div>
    </AppShell>
  );
}
