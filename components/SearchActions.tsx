"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  PencilSimple,
  Pause,
  Play,
  Trash,
} from "@phosphor-icons/react";

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
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-muted hover:bg-surface-raised hover:text-foreground"
      >
        <PencilSimple size={12} weight="bold" />
        Edit
      </Link>
      <button
        onClick={toggle}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-muted hover:bg-surface-raised hover:text-foreground disabled:opacity-50"
      >
        {active ? (
          <>
            <Pause size={12} weight="bold" />
            Pause
          </>
        ) : (
          <>
            <Play size={12} weight="bold" />
            Resume
          </>
        )}
      </button>
      <button
        onClick={remove}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-muted hover:bg-surface-raised hover:text-danger disabled:opacity-50"
      >
        <Trash size={12} weight="bold" />
        Delete
      </button>
    </div>
  );
}
