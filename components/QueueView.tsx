"use client";

import {
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  ArrowClockwise,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bookmark,
  CaretRight,
  Check,
  ListDashes,
  Prohibit,
  Shuffle,
  SortAscending,
  SquaresFour,
  TelevisionSimple,
} from "@phosphor-icons/react";
import { formatDuration, formatRelative } from "@/lib/format";
import { categoryName } from "@/lib/categories";
import { Toast, type ToastData } from "./Toast";

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

type Sort = "newest" | "oldest" | "channel" | "random";
type View = "all" | "channels" | "categories";

/** Mulberry32 PRNG — deterministic shuffle given a seed */
function seededShuffle<T>(xs: T[], seed: number): T[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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
  const [shuffleSeed, setShuffleSeed] = useState(() => Date.now() % 2147483647);
  const [pending, startTransition] = useTransition();
  type OptimisticAction =
    | { type: "remove"; id: string }
    | { type: "restore"; entry: QueueEntry };
  const [optimisticEntries, applyOptimistic] = useOptimistic(
    entries,
    (state: QueueEntry[], action: OptimisticAction) => {
      if (action.type === "remove")
        return state.filter((e) => e.id !== action.id);
      if (action.type === "restore") {
        if (state.some((e) => e.id === action.entry.id)) return state;
        return [action.entry, ...state];
      }
      return state;
    }
  );

  const [toast, setToast] = useState<ToastData | null>(null);
  const toastTimer = useRef<number | null>(null);
  function showToast(next: ToastData, ms = 4500) {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = window.setTimeout(() => {
      setToast((cur) => (cur?.id === next.id ? null : cur));
      toastTimer.current = null;
    }, ms);
  }
  function dismissToast() {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = null;
    setToast(null);
  }

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

  function updateState(
    entry: QueueEntry,
    status: QueueEntry["status"] | "remove"
  ) {
    const prior = { ...entry };
    startTransition(async () => {
      applyOptimistic({ type: "remove", id: entry.id });
      await fetch(`/api/videos/${entry.id}/state`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    });
    const labels: Record<typeof status, string> = {
      watched: "Marked as watched",
      saved_later: "Saved for later",
      not_interested: "Not interested",
      new: "Moved to queue",
      in_progress: "Marked in progress",
      remove: "Removed",
    };
    showToast({
      id: Date.now(),
      message: labels[status] ?? "Updated",
      undo: () => {
        startTransition(async () => {
          applyOptimistic({ type: "restore", entry: prior });
          await fetch(`/api/videos/${entry.id}/state`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              status: prior.status,
              progressSeconds: prior.progressSeconds,
            }),
          });
          router.refresh();
        });
      },
    });
  }

  async function fetchNew() {
    setShuffleSeed(Date.now() % 2147483647);
    const res = await fetch("/api/cron/poll", { method: "POST" });
    if (res.ok) startTransition(() => router.refresh());
  }

  const activeFilter = channelId
    ? {
        type: "channel" as const,
        label:
          optimisticEntries.find((e) => e.channelId === channelId)
            ?.channelTitle ?? "Channel",
      }
    : categoryId
    ? { type: "category" as const, label: categoryName(categoryId) }
    : null;

  const filtered = useMemo(() => {
    if (channelId)
      return optimisticEntries.filter((e) => e.channelId === channelId);
    if (categoryId)
      return optimisticEntries.filter((e) => e.categoryId === categoryId);
    return optimisticEntries;
  }, [optimisticEntries, channelId, categoryId]);

  const sorted = useMemo(() => {
    if (sort === "random") return seededShuffle(filtered, shuffleSeed);
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
  }, [filtered, sort, shuffleSeed]);

  const inProgress = sorted.filter((e) => e.status === "in_progress");
  const fresh = sorted.filter((e) => e.status === "new");
  const hasAnything = inProgress.length + fresh.length > 0;

  const [pullDistance, pullRef] = usePullToRefresh(fetchNew, pending);

  return (
    <div className="space-y-6" ref={pullRef as React.RefObject<HTMLDivElement>}>
      <PullIndicator distance={pullDistance} refreshing={pending} />

      {/* View tabs — segmented control */}
      <div className="inline-flex items-center gap-0.5 rounded-full bg-surface p-1 text-sm">
        <ViewTab
          icon={ListDashes}
          active={view === "all" && !channelId && !categoryId}
          onClick={() =>
            setParam({ view: null, channel: null, category: null })
          }
        >
          All
          <span className="ml-1 text-xs opacity-60">
            {optimisticEntries.length}
          </span>
        </ViewTab>
        <ViewTab
          icon={TelevisionSimple}
          active={view === "channels" || !!channelId}
          onClick={() =>
            setParam({ view: "channels", channel: null, category: null })
          }
        >
          Channels
        </ViewTab>
        <ViewTab
          icon={SquaresFour}
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
            className="flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-muted transition hover:text-foreground"
          >
            <ArrowLeft size={14} weight="bold" /> Back
          </button>
          <span className="text-muted">·</span>
          <span className="font-medium">{activeFilter.label}</span>
          <span className="text-muted">({filtered.length})</span>
        </div>
      )}

      {view === "channels" && !channelId ? (
        <ChannelList entries={optimisticEntries} onPick={(id) => setParam({ view: null, channel: id })} />
      ) : view === "categories" && !categoryId ? (
        <CategoryList entries={optimisticEntries} onPick={(id) => setParam({ view: null, category: id })} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-0.5 rounded-full bg-surface p-1 text-xs">
              <SortPill
                icon={ArrowDown}
                active={sort === "newest"}
                onClick={() => setSort("newest")}
              >
                Newest
              </SortPill>
              <SortPill
                icon={ArrowUp}
                active={sort === "oldest"}
                onClick={() => setSort("oldest")}
              >
                Oldest
              </SortPill>
              <SortPill
                icon={SortAscending}
                active={sort === "channel"}
                onClick={() => setSort("channel")}
              >
                Channel
              </SortPill>
              <SortPill
                icon={Shuffle}
                active={sort === "random"}
                onClick={() => {
                  setShuffleSeed(Date.now() % 2147483647);
                  setSort("random");
                }}
              >
                Random
              </SortPill>
            </div>
            <button
              onClick={fetchNew}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-50"
            >
              <ArrowClockwise
                size={14}
                weight="bold"
                className={pending ? "animate-spin" : ""}
              />
              {pending ? "Checking" : "Get new"}
            </button>
          </div>

          {inProgress.length > 0 && (
            <section className="space-y-3">
              <SectionLabel>In progress</SectionLabel>
              <div className="-mx-4 overflow-x-auto pb-2 sm:-mx-6 lg:-mx-8">
                <div className="flex snap-x snap-mandatory gap-3 px-4 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <AnimatePresence initial={false}>
                    {inProgress.map((entry) => (
                      <motion.div
                        key={entry.id}
                        layout
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="w-60 shrink-0 snap-start sm:w-64"
                      >
                        <VideoCard
                          entry={entry}
                          progressPct={
                            entry.durationSeconds
                              ? Math.min(
                                  100,
                                  (entry.progressSeconds /
                                    entry.durationSeconds) *
                                    100
                                )
                              : 0
                          }
                          onAction={updateState}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
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
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

type PhosphorIcon = React.ComponentType<{
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
}>;

function ViewTab({
  children,
  active,
  onClick,
  icon: Icon,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon: PhosphorIcon;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
        active
          ? "bg-surface-raised text-foreground shadow-sm"
          : "text-muted hover:text-foreground"
      }`}
    >
      <Icon size={16} weight={active ? "fill" : "regular"} />
      {children}
    </button>
  );
}

function SortPill({
  children,
  active,
  onClick,
  icon: Icon,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon: PhosphorIcon;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition ${
        active
          ? "bg-surface-raised text-foreground shadow-sm"
          : "text-muted hover:text-foreground"
      }`}
    >
      <Icon size={12} weight="bold" />
      {children}
    </button>
  );
}

const PULL_THRESHOLD = 72;
const PULL_MAX = 120;

function usePullToRefresh(
  onRefresh: () => void | Promise<void>,
  refreshing: boolean
): [number, React.RefObject<HTMLDivElement | null>] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [distance, setDistance] = useState(0);
  const startY = useRef<number | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || refreshing) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
      triggered.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setDistance(0);
        return;
      }
      // Resist pulling the further we go
      const resisted = Math.min(PULL_MAX, Math.pow(dy, 0.85));
      setDistance(resisted);
    }

    function onTouchEnd() {
      if (distance >= PULL_THRESHOLD && !triggered.current) {
        triggered.current = true;
        onRefresh();
      }
      setDistance(0);
      startY.current = null;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [distance, onRefresh, refreshing]);

  return [distance, ref];
}

function PullIndicator({
  distance,
  refreshing,
}: {
  distance: number;
  refreshing: boolean;
}) {
  const visible = distance > 8 || refreshing;
  const progress = Math.min(1, distance / PULL_THRESHOLD);
  const rotation = refreshing ? 0 : progress * 360;
  const height = refreshing ? 48 : Math.min(80, distance);

  return (
    <div
      className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-150 ease-out"
      style={{ height: visible ? height : 0 }}
      aria-hidden
    >
      <ArrowClockwise
        size={22}
        weight="bold"
        className={`text-muted transition-colors ${
          progress >= 1 ? "text-accent" : ""
        } ${refreshing ? "animate-spin text-accent" : ""}`}
        style={refreshing ? undefined : { transform: `rotate(${rotation}deg)` }}
      />
    </div>
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
            <CaretRight
              size={16}
              weight="bold"
              className="shrink-0 text-muted"
              aria-hidden
            />
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
            <CaretRight
              size={16}
              weight="bold"
              className="shrink-0 text-muted"
              aria-hidden
            />
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
  onAction: (entry: QueueEntry, status: QueueEntry["status"] | "remove") => void;
}) {
  const narrow = useIsNarrow();
  const [dragX, setDragX] = useState(0);

  function onDragEnd(_: unknown, info: PanInfo) {
    const offset = info.offset.x;
    if (offset < -120) onAction(entry, "not_interested");
    else if (offset > 120) onAction(entry, "watched");
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
      className="relative h-full"
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
            ← Watched
          </span>
          <span
            className={`text-danger transition-opacity ${
              dragX < -20 ? "opacity-100" : "opacity-0"
            }`}
          >
            Not interested →
          </span>
        </div>
      )}
      <motion.div
        drag={narrow ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        onDrag={(_, info) => setDragX(info.offset.x)}
        onDragEnd={onDragEnd}
        className="relative h-full"
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
  onAction: (entry: QueueEntry, status: QueueEntry["status"] | "remove") => void;
}) {
  const showSavedSearch =
    !!entry.savedSearch &&
    entry.savedSearch.name.trim().toLowerCase() !==
      entry.channelTitle.trim().toLowerCase();

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl bg-surface">
      <Link
        href={`/watch/${entry.id}`}
        className="flex flex-1 flex-col focus-visible:outline-none"
      >
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
        <div className="flex flex-1 flex-col gap-1.5 px-3.5 pt-3 pb-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">
            {entry.title}
          </h3>
          <div className="mt-auto flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
            <span>{entry.channelTitle}</span>
            <span>·</span>
            <span>{formatRelative(new Date(entry.publishedAt))}</span>
            {showSavedSearch && (
              <>
                <span>·</span>
                <span className="truncate">{entry.savedSearch!.name}</span>
              </>
            )}
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-1 border-t border-border/60 px-2 py-1.5 text-xs">
        <RowButton
          icon={Check}
          onClick={() => onAction(entry, "watched")}
        >
          Watched
        </RowButton>
        <RowButton
          icon={Bookmark}
          onClick={() => onAction(entry, "saved_later")}
        >
          Later
        </RowButton>
        <RowButton
          icon={Prohibit}
          onClick={() => onAction(entry, "not_interested")}
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
  icon: Icon,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon: PhosphorIcon;
  tone?: "default" | "danger";
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-muted transition hover:bg-surface-raised hover:text-foreground ${
        tone === "danger" ? "hover:text-danger" : ""
      }`}
    >
      <Icon size={12} weight="bold" />
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
