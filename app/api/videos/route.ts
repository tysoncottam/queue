import { auth } from "@/auth";
import { extractVideoId, getVideosByIds } from "@/lib/youtube";
import { saveMatchedVideos } from "@/lib/poll";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({ input: z.string().min(1) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { input } = bodySchema.parse(await req.json());
  const videoId = extractVideoId(input);
  if (!videoId)
    return NextResponse.json(
      { error: "Couldn't find a video ID in that link." },
      { status: 400 }
    );

  const [video] = await getVideosByIds([videoId]);
  if (!video)
    return NextResponse.json(
      { error: "Video not found or is private." },
      { status: 404 }
    );

  const result = await saveMatchedVideos(session.user.id, null, [video]);
  return NextResponse.json({
    ok: true,
    added: result.added,
    alreadyInQueue: result.skipped > 0,
    video: { id: video.id, title: video.title },
  });
}
