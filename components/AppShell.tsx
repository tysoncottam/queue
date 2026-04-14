import Image from "next/image";
import { signOut } from "@/auth";
import { BottomTabs } from "./BottomTabs";
import { DesktopNav } from "./DesktopNavLink";

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name?: string | null; image?: string | null; email?: string | null };
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="glass hairline-bottom sticky top-0 z-30 hidden sm:block"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-1 px-6 py-2.5 lg:px-8">
          <DesktopNav />
          <form
            className="ml-auto"
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/sign-in" });
            }}
          >
            <button
              type="submit"
              className="hairline flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface-raised text-caption text-muted transition hover:opacity-80"
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
      </header>
      <main
        className="mx-auto w-full max-w-[1600px] flex-1 px-4 sm:px-6 lg:px-8"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)",
        }}
      >
        <div className="pt-2 sm:pt-4">{children}</div>
      </main>
      <BottomTabs />
    </div>
  );
}
