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

      <div className="space-y-2">
        <h1 className="text-xl font-semibold leading-snug lg:text-2xl">
          {video.title}
        </h1>
        <p className="text-sm text-muted">
          {video.channelTitle} · {formatRelative(new Date(video.publishedAt))}
        </p>
      </div>

      {video.description && (
        <details className="rounded-xl bg-surface p-4 text-sm text-muted">
          <summary className="cursor-pointer select-none text-xs font-medium uppercase tracking-wider">
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
