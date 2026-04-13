import { google, youtube_v3 } from "googleapis";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const apiKey = process.env.YOUTUBE_API_KEY;

function publicClient() {
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is not set");
  return google.youtube({ version: "v3", auth: apiKey });
}

async function userClient(userId: string) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")))
    .limit(1);

  if (!account) throw new Error("No Google account linked");

  const oauth2 = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );
  oauth2.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  oauth2.on("tokens", async (tokens) => {
    await db
      .update(accounts)
      .set({
        access_token: tokens.access_token ?? account.access_token,
        expires_at: tokens.expiry_date
          ? Math.floor(tokens.expiry_date / 1000)
          : account.expires_at,
        refresh_token: tokens.refresh_token ?? account.refresh_token,
      })
      .where(
        and(
          eq(accounts.provider, account.provider),
          eq(accounts.providerAccountId, account.providerAccountId)
        )
      );
  });

  return google.youtube({ version: "v3", auth: oauth2 });
}

export type ChannelResult = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount?: string;
  isVerified?: boolean;
};

/**
 * YouTube Data API v3 doesn't expose channel verification status. Scrape
 * the channel page HTML for the verified badge marker. Best-effort only.
 */
export async function checkChannelVerified(channelId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.youtube.com/channel/${channelId}`, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return false;
    const html = await res.text();
    return (
      html.includes("BADGE_STYLE_TYPE_VERIFIED") ||
      html.includes("BADGE_STYLE_TYPE_VERIFIED_ARTIST")
    );
  } catch {
    return false;
  }
}

export async function searchChannels(query: string): Promise<ChannelResult[]> {
  const yt = publicClient();
  const res = await yt.search.list({
    part: ["snippet"],
    q: query,
    type: ["channel"],
    maxResults: 50,
  });

  const ids = (res.data.items ?? [])
    .map((i) => i.id?.channelId)
    .filter((id): id is string => !!id);

  if (ids.length === 0) return [];

  const detail = await yt.channels.list({
    part: ["snippet", "statistics"],
    id: ids,
  });

  const base: ChannelResult[] = (detail.data.items ?? []).map((c) => ({
    id: c.id!,
    title: c.snippet?.title ?? "",
    description: c.snippet?.description ?? "",
    thumbnail:
      c.snippet?.thumbnails?.medium?.url ??
      c.snippet?.thumbnails?.default?.url ??
      "",
    subscriberCount: c.statistics?.subscriberCount ?? undefined,
  }));

  // Narrow to the top ~15 likely matches before paying for verification checks.
  const q = query.toLowerCase();
  const subs = (c: ChannelResult) => parseInt(c.subscriberCount ?? "0", 10) || 0;
  const preranked = base
    .map((c) => ({ c, titleMatch: c.title.toLowerCase().includes(q) }))
    .sort((a, b) => {
      if (a.titleMatch !== b.titleMatch) return a.titleMatch ? -1 : 1;
      return subs(b.c) - subs(a.c);
    })
    .slice(0, 15)
    .map(({ c }) => c);

  // Fetch verification status in parallel. Failures are silently not-verified.
  const verified = await Promise.all(
    preranked.map((c) => checkChannelVerified(c.id))
  );
  const enriched = preranked.map((c, i) => ({ ...c, isVerified: verified[i] }));

  return enriched.sort((a, b) => {
    if (!!b.isVerified !== !!a.isVerified) return b.isVerified ? 1 : -1;
    return subs(b) - subs(a);
  });
}

export async function getUploadsPlaylistId(
  channelId: string
): Promise<string | null> {
  const yt = publicClient();
  const res = await yt.channels.list({
    part: ["contentDetails"],
    id: [channelId],
  });
  return res.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
}

export type VideoSummary = {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: Date;
  durationSeconds: number | null;
  categoryId: string | null;
};

export async function listRecentUploads(
  channelId: string,
  opts: { publishedAfter?: Date; maxResults?: number } = {}
): Promise<VideoSummary[]> {
  const yt = publicClient();
  const uploadsId = await getUploadsPlaylistId(channelId);
  if (!uploadsId) return [];

  const videoIds: string[] = [];
  let pageToken: string | undefined;
  const cap = opts.maxResults ?? 50;
  const cutoff = opts.publishedAfter?.getTime() ?? 0;

  outer: while (videoIds.length < cap) {
    const res: { data: youtube_v3.Schema$PlaylistItemListResponse } =
      await yt.playlistItems.list({
        part: ["snippet", "contentDetails"],
        playlistId: uploadsId,
        maxResults: 50,
        pageToken,
      });

    for (const item of res.data.items ?? []) {
      const videoId = item.contentDetails?.videoId;
      const published = item.contentDetails?.videoPublishedAt
        ? new Date(item.contentDetails.videoPublishedAt).getTime()
        : 0;
      if (!videoId) continue;
      if (cutoff && published && published < cutoff) break outer;
      videoIds.push(videoId);
      if (videoIds.length >= cap) break outer;
    }

    pageToken = res.data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  if (videoIds.length === 0) return [];
  return getVideosByIds(videoIds);
}

export async function getVideosByIds(ids: string[]): Promise<VideoSummary[]> {
  const yt = publicClient();
  const out: VideoSummary[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const res = await yt.videos.list({
      part: ["snippet", "contentDetails"],
      id: chunk,
    });
    for (const v of res.data.items ?? []) {
      if (!v.id || !v.snippet) continue;
      out.push({
        id: v.id,
        title: v.snippet.title ?? "",
        description: v.snippet.description ?? "",
        channelId: v.snippet.channelId ?? "",
        channelTitle: v.snippet.channelTitle ?? "",
        thumbnailUrl:
          v.snippet.thumbnails?.maxres?.url ??
          v.snippet.thumbnails?.high?.url ??
          v.snippet.thumbnails?.medium?.url ??
          v.snippet.thumbnails?.default?.url ??
          "",
        publishedAt: new Date(v.snippet.publishedAt ?? Date.now()),
        durationSeconds: parseIsoDuration(v.contentDetails?.duration ?? ""),
        categoryId: v.snippet.categoryId ?? null,
      });
    }
  }
  return out;
}

export function parseIsoDuration(iso: string): number | null {
  if (!iso) return null;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const h = parseInt(m[1] ?? "0", 10);
  const min = parseInt(m[2] ?? "0", 10);
  const s = parseInt(m[3] ?? "0", 10);
  return h * 3600 + min * 60 + s;
}

/**
 * Determine if a video is a YouTube Short by hitting the /shorts/{id} URL.
 * Shorts return 200; regular videos 303-redirect to /watch. This is how
 * YouTube itself distinguishes them — there's no API field.
 */
export async function checkIsShort(videoId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      method: "HEAD",
      redirect: "manual",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(5000),
    });
    // 200 = stayed on /shorts (is a Short)
    // 3xx = redirected to /watch (not a Short)
    return res.status === 200;
  } catch {
    // On error (timeout, network), assume NOT a short so we don't drop real content
    return false;
  }
}

export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1).split("/")[0] || null;
    }
    if (url.hostname.endsWith("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
      if (m) return m[1];
    }
  } catch {
    /* fall through */
  }
  return null;
}

export type CommentThread = {
  id: string;
  author: string;
  authorAvatar: string;
  authorChannelUrl: string;
  text: string;
  likeCount: number;
  publishedAt: Date;
  replyCount: number;
};

export async function getComments(
  videoId: string,
  pageToken?: string
): Promise<{ comments: CommentThread[]; nextPageToken?: string }> {
  const yt = publicClient();
  try {
    const res = await yt.commentThreads.list({
      part: ["snippet"],
      videoId,
      maxResults: 20,
      order: "relevance",
      pageToken,
    });
    const comments: CommentThread[] = (res.data.items ?? [])
      .map((t) => {
        const top = t.snippet?.topLevelComment?.snippet;
        if (!top) return null;
        return {
          id: t.id ?? "",
          author: top.authorDisplayName ?? "",
          authorAvatar: top.authorProfileImageUrl ?? "",
          authorChannelUrl: top.authorChannelUrl ?? "",
          text: top.textDisplay ?? "",
          likeCount: top.likeCount ?? 0,
          publishedAt: new Date(top.publishedAt ?? Date.now()),
          replyCount: t.snippet?.totalReplyCount ?? 0,
        };
      })
      .filter((c): c is CommentThread => c !== null);
    return { comments, nextPageToken: res.data.nextPageToken ?? undefined };
  } catch (err: unknown) {
    const e = err as { code?: number; errors?: unknown };
    if (e?.code === 403) return { comments: [] };
    throw err;
  }
}

export async function postComment(
  userId: string,
  videoId: string,
  text: string
): Promise<void> {
  const yt = await userClient(userId);
  await yt.commentThreads.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        videoId,
        topLevelComment: { snippet: { textOriginal: text } },
      },
    },
  });
}
