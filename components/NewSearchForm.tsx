"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchPreview, type Candidate } from "./SearchPreview";

type Channel = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount?: string;
  isVerified?: boolean;
};

function VerifiedBadge() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-label="Verified"
      className="shrink-0 text-muted"
    >
      <path
        fill="currentColor"
        d="M12 2 9.5 4.5 6 4l-.5 3.5L2 9.5 4.5 12 2 14.5 5.5 16 6 19.5 9.5 19 12 21.5l2.5-2.5 3.5.5.5-3.5 3.5-1.5-2.5-2.5 2.5-2.5-3.5-1.5-.5-3.5-3.5.5zM10.6 15.6 6.8 11.8l1.4-1.4 2.4 2.4 5-5 1.4 1.4z"
      />
    </svg>
  );
}

export function NewSearchForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Channel[]>([]);
  const [searching, setSearching] = useState(false);
  const [channel, setChannel] = useState<Channel | null>(null);

  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [publishedAfter, setPublishedAfter] = useState(
    `${new Date().getFullYear()}-01-01`
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Refetch candidates whenever channel or publishedAfter changes (not on keyword edits).
  useEffect(() => {
    if (!channel) {
      setCandidates(null);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch("/api/searches/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            channelId: channel.id,
            publishedAfter: publishedAfter || null,
          }),
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setCandidates(data.candidates ?? []);
        }
      } catch {
        /* aborted or network error */
      } finally {
        setPreviewLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [channel, publishedAfter]);

  function addKeyword(phrase: string) {
    setKeywords((prev) => {
      const existing = prev
        .split(/[,\n]/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (existing.some((t) => t.toLowerCase() === phrase.toLowerCase())) {
        return prev;
      }
      return [...existing, phrase].join(", ");
    });
  }

  useEffect(() => {
    if (!query.trim() || channel) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/channels/search?q=${encodeURIComponent(query)}`
        );
        if (res.ok) setResults(await res.json());
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, channel]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!channel) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/searches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || channel.title,
          channelId: channel.id,
          channelTitle: channel.title,
          channelThumbnail: channel.thumbnail,
          keywords: keywords.trim() || undefined,
          publishedAfter: publishedAfter || undefined,
          backfill: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong.");
        return;
      }
      startTransition(() => router.push("/searches"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-12">
    <form onSubmit={submit} className="space-y-6">
      <Field label="Channel">
        {channel ? (
          <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
            {channel.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={channel.thumbnail}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-medium">{channel.title}</p>
                {channel.isVerified && <VerifiedBadge />}
              </div>
              {channel.subscriberCount && (
                <p className="text-xs text-muted">
                  {formatCount(channel.subscriberCount)} subscribers
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setChannel(null);
                setQuery("");
              }}
              className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-raised hover:text-foreground"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search YouTube channels…"
              className="w-full rounded-xl bg-surface px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-muted"
              autoFocus
            />
            {searching && (
              <p className="mt-2 text-xs text-muted">Searching…</p>
            )}
            {results.length > 0 && (
              <ul className="mt-2 space-y-1 overflow-hidden rounded-xl bg-surface ring-1 ring-border">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setChannel(r);
                        setName(r.title);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-raised"
                    >
                      {r.thumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.thumbnail}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm">{r.title}</p>
                          {r.isVerified && <VerifiedBadge />}
                        </div>
                        {r.subscriberCount && (
                          <p className="text-xs text-muted">
                            {formatCount(r.subscriberCount)} subscribers
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Field>

      {channel && (
        <>
          <Field label="Name" hint="What this search is called in your list.">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={channel.title}
              className="w-full rounded-xl bg-surface px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-muted"
            />
          </Field>

          <Field
            label="Keywords (optional)"
            hint="Only include videos whose title contains one of these phrases. Comma-separated."
          >
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. Dodgers, highlights"
              className="w-full rounded-xl bg-surface px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-muted"
            />
          </Field>

          <Field
            label="Only from (optional)"
            hint={
              publishedAfter
                ? "Ignore videos published before this date."
                : "Showing videos from all time."
            }
          >
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={publishedAfter}
                onChange={(e) => setPublishedAfter(e.target.value)}
                className="w-full rounded-xl bg-surface px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-muted"
              />
              {publishedAfter && (
                <button
                  type="button"
                  onClick={() => setPublishedAfter("")}
                  className="shrink-0 rounded-lg px-3 py-2 text-xs text-muted hover:bg-surface-raised hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          </Field>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting || pending}
            className="w-full rounded-xl bg-foreground py-3 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {submitting
              ? "Creating & pulling videos…"
              : "Create & backfill now"}
          </button>
        </>
      )}
    </form>
    <div>
      <SearchPreview
        loading={previewLoading}
        candidates={candidates}
        keywords={keywords}
        onAddKeyword={addKeyword}
      />
    </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

function formatCount(str: string): string {
  const n = parseInt(str, 10);
  if (!Number.isFinite(n)) return str;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
