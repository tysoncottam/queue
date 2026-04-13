import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { pollAllSearchesForUser } from "@/lib/poll";
import { NextResponse } from "next/server";

async function runForAllUsers() {
  const all = await db.select({ id: users.id }).from(users);
  const results = [];
  for (const u of all) {
    const r = await pollAllSearchesForUser(u.id);
    results.push({ userId: u.id, results: r });
  }
  return results;
}

export async function POST() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const results = await pollAllSearchesForUser(session.user.id);
  return NextResponse.json({ ok: true, results });
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await runForAllUsers();
  return NextResponse.json({ ok: true, results });
}
