"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookmarksSimple,
  ListDashes,
  MagnifyingGlass,
  PlusCircle,
} from "@phosphor-icons/react";

const LINKS = [
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

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active = link.match(pathname);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-subhead transition ${
              active
                ? "bg-surface-raised text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Icon size={16} weight={active ? "fill" : "regular"} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
