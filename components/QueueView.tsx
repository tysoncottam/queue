"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { formatDuration, formatRelative } from "@/lib/format";
import { categoryName } from "@/lib/categories";

function useIsNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return narrow;
}

export type QueueEntry = {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationSeconds: number | null;
  categoryId: string | null;
  status: "new" | "in_progress" | "watched" | "saved_later" | "not_interested";
  progressSeconds: number;
  addedAt: string;
  savedSearch: { id: string; name: string } | null;
};

type Sort = "newest" | "oldest" | "channel";
type View = "all" | "channels" | "categories";

export function QueueView({
  entries,
  initialSort,
  initialView,
  initialChannelId,
  initialCategoryId,
}: {
  entries: QueueEntry[];
  initialSort: Sort;
  initialView: View;
  initialChannelId: string | null;
  initialCategoryId: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [sort, setSort] = useState<Sort>(initialSort);
  const [local, setLocal] = useState<QueueEntry[]>(entries);
  const [pending, startTransition] = useTransition();

  useEffect(() => setLocal(entries), [entries]);

  const view = (params.get("view") as View) ?? initialView ?? "all";
  const channelId = params.get("channel") ?? initialChannelId;
  const categoryId = params.get("category") ?? initialCategoryId;

  function setParam(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  }

  async function updateState(
    videoId: string,
    status: QueueEntry["status"] | "remove"
  ) {
    setLocal((prev) => prev.filter((e) => e.id !== videoId));
    await fetch(`/api/videos/${videoId}/state`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    startTransition(() => router.refresh());
  }

  async function fetchNew() {
    const res = await fetch("/api/cron/poll", { method: "POST" });
    if (res.ok) startTransition(() => router.refresh());
  }

  const activeFilter = channelId
    ? {
        type: "channel" as const,
        label:
          local.find((e) => e.channelId === channelId)?.channelTitle ??
          "Channel",
      }
    : categoryId
    ? { type: "category" as const, label: categoryName(categoryId) }
    : null;

  const filtered = useMemo(() => {
    if (channelId) return local.filter((e) => e.channelId === channelId);
    if (categoryId) return local.filter((e) => e.categoryId === categoryId);
    return local;
  }, [local, channelId, categoryId]);

  const sorted = useMemo(() => {
    const xs = [...filtered];
    xs.sort((a, b) => {
      if (sort === "newest")
        return (
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      if (sort === "oldest")
        return (
          new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
        );
      return a.channelTitle.localeCompare(b.channelTitle);
    });
    return xs;
  }, [filtered, sort]);

  const inProgress = sorted.filter((e) => e.status === "in_progress");
  const fresh = sorted.filter((e) => e.status === "new");
  const hasAnything = inProgress.length + fresh.length > 0;

  return (
    <div className="space-y-6">
      {/* View tabs */}
      <div className="flex items-center gap-1 text-sm">
        <ViewTab
          active={view === "all" && !channelId && !categoryId}
          onClick={() =>
            setParam({ view: null, channel: null, category: null })
          }
        >
          All
          <span className="ml-1.5 text-xs text-muted">{local.length}</span>
        </ViewTab>
        <ViewTab
          active={view === "channels" || !!channelId}
          onClick={() =>
            setParam({ view: "channels", channel: null, category: null })
          }
        >
          Channels
        </ViewTab>
        <ViewTab
          active={view === "categories" || !!categoryId}
          onClick={() =>
            setParam({ view: "categories", channel: null, category: null })
          }
        >
          Categories
        </ViewTab>
      </div>

      {activeFilter && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() =>
              setParam({
                view: activeFilter.type === "channel" ? "channels" : "categories",
                channel: null,
                category: null,
              })
            }
            className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-muted hover:text-foreground"
          >
            ← Back
          </button>
          <span className="text-muted">·</span>
          <span className="font-medium">{activeFilter.label}</span>
          <span className="text-muted">({filtered.length})</span>
        </div>
      )}

      {view === "channels" && !channelId ? (
        <ChannelList entries={local} onPick={(id) => setParam({ view: null, channel: id })} />
      ) : view === "categories" && !categoryId ? (
        <CategoryList entries={local} onPick={(id) => setParam({ view: null, category: id })} />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs">
              {(["newest", "oldest", "channel"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`rounded-full px-3 py-1.5 transition ${
                    sort === s
                      ? "bg-surface-raised text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {s === "channel" ? "channel" : s}
                </button>
              ))}
            </div>
            <button
              onClick={fetchNew}
              disabled={pending}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted hover:border-muted hover:text-foreground disabled:opacity-50"
            >
              {pending ? "Checking…" : "Get new"}
            </button>
          </div>

          {inProgress.length > 0 && (
            <section className="space-y-3">
              <SectionLabel>In progress</SectionLabel>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence initial={false}>
                  {inProgress.map((entry) => (
                    <VideoRow key={entry.id} entry={entry} onAction={updateState} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {fresh.length > 0 && (
            <section className="space-y-3">
              {inProgress.length > 0 && <SectionLabel>New</SectionLabel>}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence initial={false}>
                  {fresh.map((entry) => (
                    <VideoRow key={entry.id} entry={entry} onAction={updateState} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {!hasAnything && <EmptyState filtered={!!activeFilter} />}
        </>
      )}
    </div>
  );
}

function ViewTab({
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
      className={`rounded-full px-3.5 py-1.5 transition ${
        active
          ? "bg-surface-raised text-foreground"
          : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ChannelList({
  entries,
  onPick,
}: {
  entries: QueueEntry[];
  onPick: (channelId: string) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { title: string; count: number; latestThumb: string }
    >();
    for (const e of entries) {
      const ex = map.get(e.channelId);
      if (ex) {
        ex.count++;
      } else {
        map.set(e.channelId, {
          title: e.channelTitle,
          count: 1,
          latestThumb: e.thumbnailUrl,
        });
      }
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  if (groups.length === 0)
    return (
      <p className="mt-12 text-center text-sm text-muted">
        No channels in your queue yet.
      </p>
    );

  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((g) => (
        <li key={g.id}>
          <button
            onClick={() => onPick(g.id)}
            className="flex w-full items-center gap-3 rounded-xl bg-surface p-3 text-left transition hover:bg-surface-raised"
          >
            {g.latestThumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={g.latestThumb}
                alt=""
                className="h-14 w-24 shrink-0 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{g.title}</p>
              <p className="text-xs text-muted">
                {g.count} video{g.count === 1 ? "" : "s"}
              </p>
            </div>
            <span className="text-muted" aria-hidden>
              →
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function CategoryList({
  entries,
  onPick,
}: {
  entries: QueueEntry[];
  onPick: (categoryId: string) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const key = e.categoryId ?? "uncategorized";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([id, count]) => ({ id, count, name: categoryName(id) }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  if (groups.length === 0)
    return (
      <p className="mt-12 text-center text-sm text-muted">
        No videos to categorize yet.
      </p>
    );

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {groups.map((g) => (
        <li key={g.id}>
          <button
            onClick={() => onPick(g.id === "uncategorized" ? "" : g.id)}
            className="flex w-full items-center justify-between rounded-xl bg-surface p-4 text-left transition hover:bg-surface-raised"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{g.name}</p>
              <p className="text-xs text-muted">
                {g.count} video{g.count === 1 ? "" : "s"}
              </p>
            </div>
            <span className="text-muted" aria-hidden>
              →
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
      {children}
    </h2>
  );
}

function VideoRow({
  entry,
  onAction,
}: {
  entry: QueueEntry;
  onAction: (id: string, status: QueueEntry["status"] | "remove") => void;
}) {
  const narrow = useIsNarrow();
  const [dragX, setDragX] = useState(0);

  function onDragEnd(_: unknown, info: PanInfo) {
    const offset = info.offset.x;
    if (offset < -120) onAction(entry.id, "watched");
    else if (offset > 120) onAction(entry.id, "saved_later");
    setDragX(0);
  }

  const progressPct = entry.durationSeconds
    ? Math.min(100, (entry.progressSeconds / entry.durationSeconds) * 100)
    : 0;

  return (
    <motion.div
      layout
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="relative"
    >
      {narrow && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-between rounded-xl px-6 text-xs font-medium"
          aria-hidden
        >
          <span
            className={`text-accent transition-opacity ${
              dragX > 20 ? "opacity-100" : "opacity-0"
            }`}
          >
            ← Save for later
          </span>
          <span
            className={`text-danger transition-opacity ${
              dragX < -20 ? "opacity-100" : "opacity-0"
            }`}
          >
            Watched →
          </span>
        </div>
      )}
      <motion.div
        drag={narrow ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        onDrag={(_, info) => setDragX(info.offset.x)}
        onDragEnd={onDragEnd}
        className="relative"
      >
        <VideoCard entry={entry} progressPct={progressPct} onAction={onAction} />
      </motion.div>
    </motion.div>
  );
}

function VideoCard({
  entry,
  progressPct,
  onAction,
}: {
  entry: QueueEntry;
  progressPct: number;
  onAction: (id: string, status: QueueEntry["status"] | "remove") => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-surface">
      <Link href={`/watch/${entry.id}`} className="block focus-visible:outline-none">
        <div className="relative aspect-video w-full overflow-hidden bg-surface-raised">
          {entry.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
          {entry.durationSeconds != null && (
            <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs tabular-nums">
              {formatDuration(entry.durationSeconds)}
            </span>
          )}
          {entry.status === "in_progress" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40">
              <div
                className="h-full bg-accent"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
        <div className="space-y-1.5 px-3.5 pt-3 pb-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">
            {entry.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span>{entry.channelTitle}</span>
            <span>·</span>
            <span>{formatRelative(new Date(entry.publishedAt))}</span>
            {entry.savedSearch && (
              <>
                <span>·</span>
                <span className="truncate">{entry.savedSearch.name}</span>
              </>
            )}
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-1 border-t border-border/60 px-2 py-1.5 text-xs">
        <RowButton onClick={() => onAction(entry.id, "watched")}>Watched</RowButton>
        <RowButton onClick={() => onAction(entry.id, "saved_later")}>Later</RowButton>
        <RowButton
          onClick={() => onAction(entry.id, "not_interested")}
          tone="danger"
        >
          Not interested
        </RowButton>
      </div>
    </div>
  );
}

function RowButton({
  children,
  onClick,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-lg px-2.5 py-1.5 text-muted transition hover:bg-surface-raised hover:text-foreground ${
        tone === "danger" ? "hover:text-danger" : ""
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  if (filtered)
    return (
      <p className="mt-16 text-center text-sm text-muted">
        No videos match this filter.
      </p>
    );
  return (
    <div className="mx-auto mt-16 max-w-sm space-y-4 text-center">
      <p className="text-sm text-muted">
        Nothing in your queue. Tap{" "}
        <span className="text-foreground">Get new</span> to pull videos from
        your saved searches, or{" "}
        <Link href="/add" className="text-foreground underline">
          paste a link
        </Link>
        .
      </p>
      <p className="text-xs text-muted">
        No searches yet?{" "}
        <Link href="/searches/new" className="text-foreground underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
