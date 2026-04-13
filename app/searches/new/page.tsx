import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { NewSearchForm } from "@/components/NewSearchForm";

export default async function NewSearchPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <AppShell user={session.user}>
      <div className="mb-6 max-w-xl">
        <h1 className="text-lg font-semibold">New search</h1>
        <p className="mt-1 text-sm text-muted">
          Pick a channel, optionally filter by keywords and date. Matching
          videos are previewed on the right as you type.
        </p>
      </div>
      <NewSearchForm />
    </AppShell>
  );
}
