import { auth } from "@/auth";
import { listRecentUploads } from "@/lib/youtube";
import { annotateShorts } from "@/lib/poll";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  channelId: z.string().min(1),
  publishedAfter: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = bodySchema.parse(await req.json());
  const publishedAfter = body.publishedAfter
    ? new Date(body.publishedAfter)
    : undefined;

  const uploads = await listRecentUploads(body.channelId, {
    publishedAfter,
    maxResults: 30,
  });

  const annotated = await annotateShorts(uploads);
  const candidates = annotated
    .filter((v) => !v.isShort)
    .map((v) => ({
      id: v.id,
      title: v.title,
      channelTitle: v.channelTitle,
      thumbnailUrl: v.thumbnailUrl,
      publishedAt: v.publishedAt.toISOString(),
      durationSeconds: v.durationSeconds,
    }));

  return NextResponse.json({ candidates });
}
