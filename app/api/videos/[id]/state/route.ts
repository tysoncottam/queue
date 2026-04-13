import { auth } from "@/auth";
import { db } from "@/lib/db";
import { videoStates } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  status: z
    .enum(["new", "in_progress", "watched", "saved_later", "not_interested", "remove"])
    .optional(),
  progressSeconds: z.number().int().nonnegative().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = patchSchema.parse(await req.json());

  if (body.status === "remove") {
    await db
      .delete(videoStates)
      .where(
        and(
          eq(videoStates.userId, session.user.id),
          eq(videoStates.videoId, id)
        )
      );
    return NextResponse.json({ ok: true });
  }

  const update: Partial<typeof videoStates.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (body.status) update.status = body.status;
  if (body.progressSeconds != null) {
    update.progressSeconds = body.progressSeconds;
    if (!body.status) update.status = "in_progress";
  }

  await db
    .update(videoStates)
    .set(update)
    .where(
      and(eq(videoStates.userId, session.user.id), eq(videoStates.videoId, id))
    );

  return NextResponse.json({ ok: true });
}
