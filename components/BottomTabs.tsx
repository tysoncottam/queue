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

const TABS = [
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
    href: "/search",
    label: "Search",
    icon: MagnifyingGlass,
    match: (p: string) => p.startsWith("/search") && !p.startsWith("/searches"),
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

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 sm:hidden"
      aria-label="Primary"
    >
      <div
        className="px-3"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)",
        }}
      >
        <div className="glass-pill rounded-full">
          <ul className="flex items-stretch justify-around px-1">
            {TABS.map((tab) => {
              const active = tab.match(pathname);
              const Icon = tab.icon;
              return (
                <li key={tab.href} className="flex-1">
                  <Link
                    href={tab.href}
                    className={`flex flex-col items-center gap-0.5 px-1 pt-2 pb-1.5 transition-[color] duration-150 ${
                      active ? "text-accent" : "text-muted"
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
      </div>
    </nav>
  );
}
