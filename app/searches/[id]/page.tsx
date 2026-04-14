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
          className="mb-4 inline-flex items-center gap-1 text-subhead text-blue"
        >
          ← Saved lists
        </Link>
        <div className="mb-5 space-y-2">
          <h1 className="text-large-title">Edit list</h1>
          <p className="text-subhead text-muted">
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
