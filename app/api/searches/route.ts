import { auth } from "@/auth";
import { db } from "@/lib/db";
import { savedSearches } from "@/lib/db/schema";
import { pollSavedSearch } from "@/lib/poll";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  channelId: z.string().min(1),
  channelTitle: z.string().min(1),
  channelThumbnail: z.string().optional(),
  keywords: z.string().optional(),
  publishedAfter: z.string().optional(),
  backfill: z.boolean().default(true),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, session.user.id))
    .orderBy(desc(savedSearches.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = createSchema.parse(await req.json());
  const [created] = await db
    .insert(savedSearches)
    .values({
      userId: session.user.id,
      name: body.name,
      channelId: body.channelId,
      channelTitle: body.channelTitle,
      channelThumbnail: body.channelThumbnail ?? null,
      keywords: body.keywords ?? null,
      publishedAfter: body.publishedAfter ?? null,
      active: true,
    })
    .returning();

  let addedCount = 0;
  if (body.backfill) {
    try {
      const result = await pollSavedSearch(session.user.id, created);
      addedCount = result.newCount;
    } catch (err) {
      console.error("backfill failed", err);
    }
  }

  return NextResponse.json({ search: created, addedCount });
}
