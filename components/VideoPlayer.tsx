"use client";

import { useEffect, useRef, useState } from "react";

type YTPlayer = {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: Record<string, (e: { data: number; target: YTPlayer }) => void>;
        }
      ) => YTPlayer;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function VideoPlayer({
  videoId,
  startSeconds,
}: {
  videoId: string;
  startSeconds: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const lastSavedRef = useRef<number>(startSeconds);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = () => {
      if (!hostRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          fs: 1,
          playsinline: 1,
          start: Math.max(0, Math.floor(startSeconds)),
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e) => {
            if (!window.YT) return;
            if (e.data === window.YT.PlayerState.ENDED) {
              saveProgress(0, "watched");
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      init();
    } else {
      const existing = document.getElementById("youtube-iframe-api");
      if (!existing) {
        const s = document.createElement("script");
        s.id = "youtube-iframe-api";
        s.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(s);
      }
      window.onYouTubeIframeAPIReady = init;
    }

    return () => {
      try {
        playerRef.current?.destroy();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  async function saveProgress(
    override?: number,
    forcedStatus?: "watched" | "in_progress"
  ) {
    const t = override ?? playerRef.current?.getCurrentTime() ?? 0;
    const rounded = Math.floor(t);
    if (!forcedStatus && Math.abs(rounded - lastSavedRef.current) < 5) return;
    lastSavedRef.current = rounded;
    await fetch(`/api/videos/${videoId}/state`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        progressSeconds: rounded,
        status: forcedStatus ?? "in_progress",
      }),
    }).catch(() => {});
  }

  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(() => saveProgress(), 10_000);
    const onHide = () => saveProgress();
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveProgress();
    });
    return () => {
      clearInterval(interval);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
      saveProgress();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <div
      className="mx-auto w-full"
      style={{
        maxWidth: "min(100%, calc((100dvh - 9rem) * 16 / 9))",
      }}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <div ref={hostRef} className="absolute inset-0 h-full w-full" />
      </div>
    </div>
  );
}
