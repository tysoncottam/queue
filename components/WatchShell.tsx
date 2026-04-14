"use client";

import { useState } from "react";
import { VideoPlayer } from "./VideoPlayer";
import { Comments } from "./Comments";
import { formatRelative } from "@/lib/format";

type Video = {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  description: string | null;
};

export function WatchShell({
  video,
  startSeconds,
}: {
  video: Video;
  startSeconds: number;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <div className="flex w-full flex-col gap-5">
      <VideoPlayer videoId={video.id} startSeconds={startSeconds} />

      <div className="space-y-1.5">
        <h1 className="text-title-2 lg:text-title-1">{video.title}</h1>
        <p className="text-subhead text-muted">
          {video.channelTitle} · {formatRelative(new Date(video.publishedAt))}
        </p>
      </div>

      {video.description && (
        <details className="rounded-2xl bg-surface p-4 text-subhead text-muted">
          <summary className="cursor-pointer select-none text-footnote font-semibold uppercase tracking-wide text-muted">
            Description
          </summary>
          <p className="mt-3 whitespace-pre-wrap">{video.description}</p>
        </details>
      )}

      <Comments
        videoId={video.id}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />
    </div>
  );
}
