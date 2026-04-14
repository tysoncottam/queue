"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { formatDuration, formatRelative } from "@/lib/format";

type Entry = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationSeconds: number | null;
  status: "new" | "in_progress" | "watched" | "saved_later" | "not_interested";
};

const STATUS_LABEL: Record<Entry["status"], string> = {
  new: "Queue",
  in_progress: "In progress",
  watched: "Watched",
  saved_later: "Saved",
  not_interested: "Not interested",
};

export function SearchView({ entries }: { entries: Entry[] }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const q = query.trim().toLowerCase();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    if (!q) return [] as Entry[];
    return entries
      .filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.channelTitle.toLowerCase().includes(q)
      )
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime()
      );
  }, [entries, q]);

  return (
    <div className="space-y-4">
      <label className="relative block">
        <MagnifyingGlass
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Title or channel"
          className="h-11 w-full rounded-xl bg-surface pl-9 pr-10 text-body placeholder:text-muted-2 focus:outline-none"
          autoComplete="off"
          enterKeyHint="search"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-2 transition hover:text-foreground"
            aria-label="Clear search"
          >
            <X size={14} weight="bold" />
          </button>
        )}
      </label>

      {!q ? (
        <p className="mt-10 text-center text-subhead text-muted">
          Search across everything you&rsquo;ve added — queue, saved,
          watched.
        </p>
      ) : results.length === 0 ? (
        <p className="mt-10 text-center text-subhead text-muted">
          No matches for &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <>
          <p className="px-0.5 text-footnote text-muted">
            {results.length} result{results.length === 1 ? "" : "s"}
          </p>
          <ul className="overflow-hidden rounded-2xl bg-surface md:grid md:grid-cols-2 md:gap-px md:bg-[color:var(--separator-opaque)] md:[&>li]:bg-surface">
            {results.map((e, i) => (
              <li
                key={e.id}
                className={i === 0 ? "" : "hairline-top md:border-t-0"}
              >
                <Link
                  href={`/watch/${e.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 transition active:bg-surface-raised hover:bg-surface-raised"
                >
                  <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-raised">
                    {e.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                    {e.durationSeconds != null && (
                      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-px text-[10px] font-medium tabular-nums text-white/90">
                        {formatDuration(e.durationSeconds)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-subhead font-medium leading-[1.3]">
                      <HighlightMatch text={e.title} q={q} />
                    </p>
                    <p className="text-footnote text-muted">
                      <HighlightMatch text={e.channelTitle} q={q} /> ·{" "}
                      {formatRelative(new Date(e.publishedAt))} ·{" "}
                      {STATUS_LABEL[e.status]}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function HighlightMatch({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const i = lower.indexOf(q);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-accent-dim px-0.5 text-foreground">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}
