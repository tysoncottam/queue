"use client";

import { useMemo } from "react";
import { formatDuration, formatRelative } from "@/lib/format";

export type Candidate = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationSeconds: number | null;
};

export function SearchPreview({
  loading,
  candidates,
  keywords,
  onAddKeyword,
}: {
  loading: boolean;
  candidates: Candidate[] | null;
  keywords: string;
  onAddKeyword: (phrase: string) => void;
}) {
  const terms = useMemo(
    () =>
      keywords
        .split(/[,\n]/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    [keywords]
  );

  const { matches, skipped } = useMemo(() => {
    const list = candidates ?? [];
    const m: Candidate[] = [];
    const s: Candidate[] = [];
    for (const c of list) {
      const hit =
        terms.length === 0 ||
        terms.some((t) => c.title.toLowerCase().includes(t));
      (hit ? m : s).push(c);
    }
    return { matches: m, skipped: s };
  }, [candidates, terms]);

  if (!candidates && !loading) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
        Pick a channel to preview videos.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">Preview</h2>
        <p className="text-xs text-muted">
          {loading
            ? "Loading…"
            : `${matches.length} match${matches.length === 1 ? "" : "es"}, ${skipped.length} skipped`}
        </p>
      </div>

      <Section
        label="Will be added"
        color="accent"
        empty={
          terms.length > 0
            ? "No videos from this channel match your keywords yet."
            : "No videos from this channel in range."
        }
        items={matches}
        highlight={terms}
      />

      {skipped.length > 0 && (
        <Section
          label="Skipped"
          color="muted"
          empty=""
          items={skipped}
          highlight={terms}
          dimmed
          onAddKeyword={terms.length > 0 ? onAddKeyword : undefined}
        />
      )}
    </div>
  );
}

function Section({
  label,
  color,
  empty,
  items,
  highlight,
  dimmed,
  onAddKeyword,
}: {
  label: string;
  color: "accent" | "muted";
  empty: string;
  items: Candidate[];
  highlight: string[];
  dimmed?: boolean;
  onAddKeyword?: (phrase: string) => void;
}) {
  return (
    <section className="space-y-2">
      <h3
        className={`text-xs font-medium uppercase tracking-wider ${
          color === "accent" ? "text-accent" : "text-muted"
        }`}
      >
        {label} <span className="text-muted">({items.length})</span>
      </h3>
      {items.length === 0 ? (
        empty && <p className="text-xs text-muted">{empty}</p>
      ) : (
        <ul
          className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
            dimmed ? "opacity-60" : ""
          }`}
        >
          {items.slice(0, 12).map((v) => (
            <li
              key={v.id}
              className="overflow-hidden rounded-lg bg-surface"
            >
              <div className="relative aspect-video w-full bg-surface-raised">
                {v.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
                {v.durationSeconds != null && (
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] tabular-nums">
                    {formatDuration(v.durationSeconds)}
                  </span>
                )}
              </div>
              <div className="space-y-1 p-2.5">
                <p className="line-clamp-2 text-xs leading-snug">
                  <HighlightTitle title={v.title} terms={highlight} />
                </p>
                <p className="text-[11px] text-muted">
                  {formatRelative(new Date(v.publishedAt))}
                </p>
                {onAddKeyword && (
                  <KeywordHints title={v.title} onAdd={onAddKeyword} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {items.length > 12 && (
        <p className="text-[11px] text-muted">
          + {items.length - 12} more…
        </p>
      )}
    </section>
  );
}

function HighlightTitle({ title, terms }: { title: string; terms: string[] }) {
  if (terms.length === 0) return <>{title}</>;
  // Split the title by matches of any term, case-insensitive.
  const re = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi"
  );
  const parts = title.split(re);
  return (
    <>
      {parts.map((p, i) =>
        terms.some((t) => p.toLowerCase() === t) ? (
          <mark
            key={i}
            className="rounded-sm bg-accent/20 px-0.5 text-foreground"
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function KeywordHints({
  title,
  onAdd,
}: {
  title: string;
  onAdd: (phrase: string) => void;
}) {
  // Extract capitalized words and 2-3 word phrases from title as quick-add suggestions.
  const suggestions = useMemo(() => {
    const tokens = title
      .replace(/[|–—·•]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    const out = new Set<string>();
    for (let i = 0; i < tokens.length; i++) {
      const w = tokens[i].replace(/[.,:;!?"']+$/g, "");
      if (w.length >= 3 && /^[A-Z]/.test(w)) out.add(w);
      if (i + 1 < tokens.length && /^[A-Z]/.test(tokens[i])) {
        const pair = `${tokens[i]} ${tokens[i + 1]}`
          .replace(/[.,:;!?"']+$/g, "")
          .trim();
        if (pair.length <= 32) out.add(pair);
      }
    }
    return Array.from(out).slice(0, 4);
  }, [title]);

  if (suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 pt-1">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onAdd(s)}
          className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-muted hover:bg-border hover:text-foreground"
          title={`Add "${s}" to keywords`}
        >
          + {s}
        </button>
      ))}
    </div>
  );
}
