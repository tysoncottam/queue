"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Search = {
  id: string;
  name: string;
  channelTitle: string;
  channelThumbnail: string | null;
  keywords: string | null;
  publishedAfter: string | null;
  active: boolean;
};

export function EditSearchForm({ search }: { search: Search }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [name, setName] = useState(search.name);
  const [keywords, setKeywords] = useState(search.keywords ?? "");
  const [publishedAfter, setPublishedAfter] = useState(
    search.publishedAfter ?? ""
  );
  const [active, setActive] = useState(search.active);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/searches/${search.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || search.channelTitle,
          keywords: keywords.trim() || null,
          publishedAfter: publishedAfter || null,
          active,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSaved(true);
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
        {search.channelThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={search.channelThumbnail}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-10 w-10 shrink-0 rounded-full bg-surface-raised" />
        )}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Channel</p>
          <p className="text-sm font-medium">{search.channelTitle}</p>
        </div>
      </div>

      <Field label="Name">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl bg-surface px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-muted"
        />
      </Field>

      <Field
        label="Keywords"
        hint="Only include videos whose title contains one of these phrases. Comma-separated. Leave blank for all videos."
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
        label="Only from"
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

      <label className="flex cursor-pointer items-center justify-between rounded-xl bg-surface p-4">
        <div>
          <p className="text-sm font-medium">Active</p>
          <p className="text-xs text-muted">
            Include this search when checking for new videos.
          </p>
        </div>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-5 w-5 accent-[color:var(--accent)]"
        />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-accent">Saved.</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-foreground py-3 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save changes"}
      </button>
    </form>
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
