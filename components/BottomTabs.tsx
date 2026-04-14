"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookmarksSimple,
  ListDashes,
  MagnifyingGlass,
  PlusCircle,
  Rows,
} from "@phosphor-icons/react";

const MAIN = [
  { href: "/", label: "Videos", icon: ListDashes, match: (p: string) => p === "/" },
  {
    href: "/searches",
    label: "Lists",
    icon: Rows,
    match: (p: string) => p.startsWith("/searches"),
  },
  {
    href: "/add",
    label: "Add",
    icon: PlusCircle,
    match: (p: string) => p === "/add",
  },
  {
    href: "/library",
    label: "Library",
    icon: BookmarksSimple,
    match: (p: string) => p.startsWith("/library"),
  },
];

export function BottomTabs() {
  const pathname = usePathname();
  if (pathname.startsWith("/watch/")) return null;
  if (pathname.startsWith("/sign-in")) return null;

  const searchActive =
    pathname.startsWith("/search") && !pathname.startsWith("/searches");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 sm:hidden"
      aria-label="Primary"
    >
      <div
        className="flex items-center gap-2 px-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
      >
        {/* Main tabs pill */}
        <div className="glass-pill flex-1 rounded-full">
          <ul className="flex items-stretch justify-around">
            {MAIN.map((tab) => {
              const active = tab.match(pathname);
              const Icon = tab.icon;
              return (
                <li key={tab.href} className="flex-1">
                  <Link
                    href={tab.href}
                    className={`pressable flex flex-col items-center gap-0.5 rounded-full px-1 py-2 ${
                      active ? "text-foreground" : "text-muted"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={22} weight={active ? "fill" : "regular"} />
                    <span
                      className={`text-[10px] leading-tight ${
                        active ? "font-semibold" : ""
                      }`}
                      style={{ letterSpacing: "0.01em" }}
                    >
                      {tab.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Floating search button — separate glass pill */}
        <Link
          href="/search"
          aria-label="Search"
          aria-current={searchActive ? "page" : undefined}
          className={`glass-pill pressable flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full ${
            searchActive ? "text-foreground" : "text-muted"
          }`}
        >
          <MagnifyingGlass
            size={22}
            weight={searchActive ? "fill" : "regular"}
          />
        </Link>
      </div>
    </nav>
  );
}
