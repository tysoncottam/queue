import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AddVideoForm } from "@/components/AddVideoForm";

export default async function AddPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <AppShell user={session.user}>
      <div className="mx-auto max-w-xl">
        <div className="mb-5 space-y-2">
          <h1 className="text-large-title">Add</h1>
          <p className="text-subhead text-muted">
            Paste a YouTube link and it goes into your videos.
          </p>
        </div>
        <AddVideoForm />
      </div>
    </AppShell>
  );
}
