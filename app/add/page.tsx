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
        <div className="mb-6">
          <h1 className="text-lg font-semibold">Add a video</h1>
          <p className="mt-1 text-sm text-muted">
            Paste a YouTube link. We&rsquo;ll add it to your queue.
          </p>
        </div>
        <AddVideoForm />
      </div>
    </AppShell>
  );
}
