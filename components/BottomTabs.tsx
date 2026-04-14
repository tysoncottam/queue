"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookmarksSimple,
  ListDashes,
  MagnifyingGlass,
  PlusCircle,
} from "@phosphor-icons/react";

const TABS = [
  { href: "/", label: "Queue", icon: ListDashes, match: (p: string) => p === "/" },
  {
    href: "/searches",
    label: "Searches",
    icon: MagnifyingGlass,
    match: (p: string) => p.startsWith("/searches"),
  },
  { href: "/add", label: "Add", icon: PlusCircle, match: (p: string) => p === "/add" },
  {
    href: "/library",
    label: "Library",
    icon: BookmarksSimple,
    match: (p: string) => p.startsWith("/library"),
  },
];

export function BottomTabs() {
  const pathname = usePathname();
  // Don't render on video player page (clean viewing)
  if (pathname.startsWith("/watch/")) return null;
  if (pathname.startsWith("/sign-in")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] transition ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon size={22} weight={active ? "fill" : "regular"} />
                <span className={active ? "font-medium" : ""}>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
