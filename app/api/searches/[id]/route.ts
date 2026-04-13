import { auth } from "@/auth";
import { db } from "@/lib/db";
import { savedSearches } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  keywords: z.string().nullable().optional(),
  publishedAfter: z.string().nullable().optional(),
  active: z.boolean().optional(),
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

  const [updated] = await db
    .update(savedSearches)
    .set(body)
    .where(
      and(eq(savedSearches.id, id), eq(savedSearches.userId, session.user.id))
    )
    .returning();

  if (!updated)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  await db
    .delete(savedSearches)
    .where(
      and(eq(savedSearches.id, id), eq(savedSearches.userId, session.user.id))
    );

  return NextResponse.json({ ok: true });
}
