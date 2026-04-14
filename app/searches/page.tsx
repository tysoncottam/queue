import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/AppShell";
import { getSavedSearches } from "@/lib/queries";
import { formatRelative } from "@/lib/format";
import { SearchActions } from "@/components/SearchActions";

export const dynamic = "force-dynamic";

export default async function SearchesPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const rows = await getSavedSearches(session.user.id);

  return (
    <AppShell user={session.user}>
      <div className="space-y-5">
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-large-title">Saved lists</h1>
          <Link
            href="/searches/new"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-foreground transition hover:opacity-80"
            aria-label="New saved list"
          >
            <Plus size={18} weight="bold" />
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="mt-12 space-y-3 text-center">
            <p className="text-subhead text-muted">No saved lists yet.</p>
            <Link
              href="/searches/new"
              className="inline-flex items-center text-body text-blue transition hover:opacity-80"
            >
              Create your first one
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((s) => {
              const keywords = s.keywords?.trim();
              const nameMatchesChannel =
                s.name.trim().toLowerCase() ===
                s.channelTitle.trim().toLowerCase();

              return (
                <li
                  key={s.id}
                  className="flex flex-col gap-4 rounded-2xl bg-surface p-4"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    {s.channelThumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.channelThumbnail}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-12 w-12 shrink-0 rounded-full bg-surface-raised" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-headline">
                          {s.channelTitle}
                        </h3>
                        {!s.active && (
                          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-caption uppercase tracking-wide text-muted">
                            paused
                          </span>
                        )}
                      </div>
                      {!nameMatchesChannel && (
                        <p className="truncate text-footnote text-muted">
                          Named &ldquo;{s.name}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <dl className="space-y-1.5 text-footnote">
                    <Row label="Videos">
                      {keywords ? (
                        <>
                          Title includes{" "}
                          {keywords.split(/[,\n]/).map((k, i, arr) => (
                            <span key={i}>
                              <span className="rounded-md bg-surface-raised px-1.5 py-0.5 font-medium text-foreground">
                                {k.trim()}
                              </span>
                              {i < arr.length - 1 ? " or " : ""}
                            </span>
                          ))}
                        </>
                      ) : (
                        <span className="text-foreground">All videos</span>
                      )}
                    </Row>
                    <Row label="From">
                      {s.publishedAfter ? (
                        <span className="text-foreground">
                          {formatDate(s.publishedAfter)} onwards
                        </span>
                      ) : (
                        <span className="text-foreground">All time</span>
                      )}
                    </Row>
                    <Row label="Polling">
                      {s.active ? (
                        <>
                          <span className="text-accent">Active</span>
                          <span className="text-muted">
                            {" · "}
                            {s.lastPolledAt
                              ? `last checked ${formatRelative(s.lastPolledAt)}`
                              : "never run"}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted">
                          Paused — not checking
                        </span>
                      )}
                    </Row>
                  </dl>

                  {/* Actions */}
                  <div className="mt-auto flex items-center justify-end border-t border-border/60 pt-3">
                    <SearchActions id={s.id} active={s.active} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-muted">{children}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
