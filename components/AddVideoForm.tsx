"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddVideoForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: value.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      if (data.alreadyInQueue && data.added === 0) {
        setMsg("Already in your queue.");
      } else {
        setMsg("Added.");
        setValue("");
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=…"
        className="w-full rounded-xl bg-surface px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-muted"
        autoFocus
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      {msg && <p className="text-sm text-accent">{msg}</p>}
      <button
        type="submit"
        disabled={submitting || !value.trim()}
        className="w-full rounded-xl bg-foreground py-3 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add to queue"}
      </button>
    </form>
  );
}
