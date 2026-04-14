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
  { href: "/", label: "Videos", icon: ListDashes, match: (p: string) => p === "/" },
  {
    href: "/searches",
    label: "Saved lists",
    icon: MagnifyingGlass,
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

  return (
    <nav
      className="glass hairline-top fixed inset-x-0 bottom-0 z-40 sm:hidden"
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
                className={`flex flex-col items-center gap-0.5 pt-2 pb-1.5 transition-[color] ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon size={24} weight={active ? "fill" : "regular"} />
                <span
                  className={`text-[10px] leading-none ${
                    active ? "font-medium" : ""
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
    </nav>
  );
}
