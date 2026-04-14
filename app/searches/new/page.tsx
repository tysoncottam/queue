import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { NewSearchForm } from "@/components/NewSearchForm";

export default async function NewSearchPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <AppShell user={session.user}>
      <div className="mb-5 max-w-xl space-y-2">
        <h1 className="text-large-title">New list</h1>
        <p className="text-subhead text-muted">
          Pick a channel, optionally filter by keywords and date. Matching
          videos preview on the right as you type.
        </p>
      </div>
      <NewSearchForm />
    </AppShell>
  );
}
