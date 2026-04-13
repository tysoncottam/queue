import { auth } from "@/auth";
import { searchChannels } from "@/lib/youtube";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);
  const results = await searchChannels(q);
  return NextResponse.json(results);
}
