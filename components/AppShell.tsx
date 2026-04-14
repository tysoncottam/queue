import Link from "next/link";
import { signOut } from "@/auth";
import Image from "next/image";
import {
  BookmarksSimple,
  MagnifyingGlass,
  PlusCircle,
} from "@phosphor-icons/react/dist/ssr";

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name?: string | null; image?: string | null; email?: string | null };
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="text-base font-semibold tracking-tight">
            Queue
          </Link>
          <nav className="ml-2 flex items-center gap-1 text-sm text-muted">
            <Link
              href="/searches"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-surface hover:text-foreground"
            >
              <MagnifyingGlass size={16} />
              <span className="hidden sm:inline">Searches</span>
            </Link>
            <Link
              href="/add"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-surface hover:text-foreground"
            >
              <PlusCircle size={16} />
              <span className="hidden sm:inline">Add</span>
            </Link>
            <Link
              href="/library"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-surface hover:text-foreground"
            >
              <BookmarksSimple size={16} />
              <span className="hidden sm:inline">Library</span>
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/sign-in" });
              }}
            >
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface-raised text-xs text-muted ring-1 ring-border hover:ring-muted"
                aria-label="Sign out"
                title={user.email ?? "Sign out"}
              >
                {user.image ? (
                  <Image
                    src={user.image}
                    alt=""
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  (user.name?.[0] ?? "?").toUpperCase()
                )}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
