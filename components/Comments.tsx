"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { formatRelative } from "@/lib/format";

type Comment = {
  id: string;
  author: string;
  authorAvatar: string;
  authorChannelUrl: string;
  text: string;
  likeCount: number;
  publishedAt: string;
  replyCount: number;
};

export function Comments({
  videoId,
  open,
  onOpenChange,
}: {
  videoId: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postedNote, setPostedNote] = useState<string | null>(null);

  useEffect(() => {
    if (!open || comments) return;
    setLoading(true);
    fetch(`/api/videos/${videoId}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .catch(() => setError("Couldn't load comments."))
      .finally(() => setLoading(false));
  }, [open, comments, videoId]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setPosting(true);
    setPostError(null);
    setPostedNote(null);
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPostError(data.error ?? "Failed to post.");
        return;
      }
      setDraft("");
      setPostedNote(
        "Posted. YouTube may take a moment to show it — reload in a bit."
      );
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="rounded-xl bg-surface">
      <button
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium">Comments</span>
        <span className="text-xs text-muted">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-border/60 p-4">
          <form onSubmit={post} className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a public comment (posts to YouTube as you)…"
              rows={2}
              className="w-full resize-none rounded-lg bg-surface-raised px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-muted"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted">
                {postError ? (
                  <span className="text-danger">{postError}</span>
                ) : postedNote ? (
                  <span className="text-accent">{postedNote}</span>
                ) : (
                  "Posts live on YouTube under your account."
                )}
              </p>
              <button
                type="submit"
                disabled={posting || !draft.trim()}
                className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </form>

          {loading && <p className="text-sm text-muted">Loading comments…</p>}
          {error && <p className="text-sm text-danger">{error}</p>}

          {comments && comments.length === 0 && !loading && (
            <p className="text-sm text-muted">No comments yet.</p>
          )}

          {comments && comments.length > 0 && (
            <ul className="space-y-4">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-3">
                  {c.authorAvatar && (
                    <Image
                      src={c.authorAvatar}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 shrink-0 rounded-full"
                      unoptimized
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs text-muted">
                      <span className="font-medium text-foreground">
                        {c.author}
                      </span>{" "}
                      · {formatRelative(new Date(c.publishedAt))}
                    </p>
                    <p
                      className="text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: c.text }}
                    />
                    {(c.likeCount > 0 || c.replyCount > 0) && (
                      <p className="text-xs text-muted">
                        {c.likeCount > 0 && `${c.likeCount} likes`}
                        {c.likeCount > 0 && c.replyCount > 0 && " · "}
                        {c.replyCount > 0 && `${c.replyCount} replies`}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
