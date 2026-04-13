"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function SearchActions({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function toggle() {
    await fetch(`/api/searches/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    startTransition(() => router.refresh());
  }

  async function remove() {
    if (!confirm("Delete this search? Videos already in your queue stay.")) return;
    await fetch(`/api/searches/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex shrink-0 gap-1 text-xs">
      <Link
        href={`/searches/${id}`}
        className="rounded-lg px-2 py-1 text-muted hover:bg-surface-raised hover:text-foreground"
      >
        Edit
      </Link>
      <button
        onClick={toggle}
        disabled={pending}
        className="rounded-lg px-2 py-1 text-muted hover:bg-surface-raised hover:text-foreground disabled:opacity-50"
      >
        {active ? "Pause" : "Resume"}
      </button>
      <button
        onClick={remove}
        disabled={pending}
        className="rounded-lg px-2 py-1 text-muted hover:bg-surface-raised hover:text-danger disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
