"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDuration, formatRelative } from "@/lib/format";

type Entry = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationSeconds: number | null;
  status: "saved_later" | "watched" | "new" | "in_progress" | "not_interested";
};

export function LibraryView({
  saved,
  watched,
}: {
  saved: Entry[];
  watched: Entry[];
}) {
  const [tab, setTab] = useState<"saved" | "watched">("saved");
  const router = useRouter();
  const [, startTransition] = useTransition();

  const list = tab === "saved" ? saved : watched;

  async function restore(id: string) {
    await fetch(`/api/videos/${id}/state`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "new" }),
    });
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    await fetch(`/api/videos/${id}/state`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "remove" }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-1 text-sm">
        <TabButton active={tab === "saved"} onClick={() => setTab("saved")}>
          Saved for later ({saved.length})
        </TabButton>
        <TabButton active={tab === "watched"} onClick={() => setTab("watched")}>
          Watched ({watched.length})
        </TabButton>
      </div>

      {list.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted">Empty.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <li key={e.id} className="flex gap-3 rounded-xl bg-surface p-3">
              <Link
                href={`/watch/${e.id}`}
                className="block shrink-0 overflow-hidden rounded-lg"
              >
                {e.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.thumbnailUrl}
                    alt=""
                    className="h-20 w-32 object-cover"
                  />
                )}
              </Link>
              <div className="min-w-0 flex-1 space-y-1">
                <Link
                  href={`/watch/${e.id}`}
                  className="line-clamp-2 text-sm font-medium leading-snug"
                >
                  {e.title}
                </Link>
                <p className="text-xs text-muted">
                  {e.channelTitle} · {formatRelative(new Date(e.publishedAt))}
                  {e.durationSeconds != null &&
                    ` · ${formatDuration(e.durationSeconds)}`}
                </p>
                <div className="flex gap-1 pt-1 text-xs">
                  {tab === "saved" ? (
                    <button
                      onClick={() => restore(e.id)}
                      className="rounded-lg px-2 py-1 text-muted hover:bg-surface-raised hover:text-foreground"
                    >
                      Move to queue
                    </button>
                  ) : (
                    <button
                      onClick={() => restore(e.id)}
                      className="rounded-lg px-2 py-1 text-muted hover:bg-surface-raised hover:text-foreground"
                    >
                      Watch again
                    </button>
                  )}
                  <button
                    onClick={() => remove(e.id)}
                    className="rounded-lg px-2 py-1 text-muted hover:bg-surface-raised hover:text-danger"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 transition ${
        active
          ? "bg-surface-raised text-foreground"
          : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
