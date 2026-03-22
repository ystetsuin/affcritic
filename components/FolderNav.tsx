"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface FolderItem {
  name: string;
  slug: string;
}

interface FolderNavProps {
  folders: FolderItem[];
}

export function FolderNav({ folders }: FolderNavProps) {
  const pathname = usePathname();

  const isActive = (slug: string | null) => {
    if (slug === null) return pathname === "/";
    return pathname === `/topics/${slug}` || pathname.startsWith(`/topics/${slug}/`);
  };

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      <NavLink href="/" active={isActive(null)}>
        Всі
      </NavLink>
      {folders.map((f) => (
        <NavLink key={f.slug} href={`/topics/${f.slug}/`} active={isActive(f.slug)}>
          {f.name}
        </NavLink>
      ))}
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-foreground text-background font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
