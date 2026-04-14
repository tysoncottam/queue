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
    <div className="space-y-5">
      <div className="flex w-full items-stretch rounded-[12px] bg-surface p-0.5 text-subhead">
        <TabButton active={tab === "saved"} onClick={() => setTab("saved")}>
          Saved ({saved.length})
        </TabButton>
        <TabButton active={tab === "watched"} onClick={() => setTab("watched")}>
          Watched ({watched.length})
        </TabButton>
      </div>

      {list.length === 0 ? (
        <p className="mt-12 text-center text-subhead text-muted">Empty.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <li key={e.id} className="flex gap-3 rounded-2xl bg-surface p-3">
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
                  className="line-clamp-2 text-subhead font-semibold leading-[1.3]"
                >
                  {e.title}
                </Link>
                <p className="text-footnote text-muted">
                  {e.channelTitle} · {formatRelative(new Date(e.publishedAt))}
                  {e.durationSeconds != null &&
                    ` · ${formatDuration(e.durationSeconds)}`}
                </p>
                <div className="flex gap-1 pt-1 text-footnote">
                  {tab === "saved" ? (
                    <button
                      onClick={() => restore(e.id)}
                      className="rounded-lg px-2 py-1 text-blue transition active:scale-95 hover:opacity-80"
                    >
                      Move back
                    </button>
                  ) : (
                    <button
                      onClick={() => restore(e.id)}
                      className="rounded-lg px-2 py-1 text-blue transition active:scale-95 hover:opacity-80"
                    >
                      Watch again
                    </button>
                  )}
                  <button
                    onClick={() => remove(e.id)}
                    className="rounded-lg px-2 py-1 text-danger transition active:scale-95 hover:opacity-80"
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
      className={`flex-1 rounded-[10px] py-1.5 font-medium transition ${
        active
          ? "bg-surface-raised text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
          : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
