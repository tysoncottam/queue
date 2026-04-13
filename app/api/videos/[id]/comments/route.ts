import { auth } from "@/auth";
import { getComments, postComment } from "@/lib/youtube";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const pageToken =
    new URL(req.url).searchParams.get("pageToken") ?? undefined;
  const data = await getComments(id, pageToken);
  return NextResponse.json(data);
}

const postSchema = z.object({ text: z.string().min(1).max(10000) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { text } = postSchema.parse(await req.json());

  try {
    await postComment(session.user.id, id, text);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    console.error("postComment failed", e);
    return NextResponse.json(
      {
        error:
          e?.code === 403
            ? "YouTube rejected the comment. Your account may not have commenting privileges via the API."
            : "Failed to post comment.",
      },
      { status: 400 }
    );
  }
}
