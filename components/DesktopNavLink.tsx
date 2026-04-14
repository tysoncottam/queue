"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type PhosphorIcon = React.ComponentType<{
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
}>;

export function DesktopNavLink({
  href,
  icon: Icon,
  match,
  children,
}: {
  href: string;
  icon: PhosphorIcon;
  match: (pathname: string) => boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = match(pathname);
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-subhead transition ${
        active
          ? "bg-surface-raised text-foreground"
          : "text-muted hover:text-foreground"
      }`}
    >
      <Icon size={16} weight={active ? "fill" : "regular"} />
      {children}
    </Link>
  );
}
