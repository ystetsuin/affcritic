"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { name: "Головна", href: "/" },
  { name: "Тематики", href: "/topics" },
  { name: "Канали", href: "/channels" },
  { name: "Теги", href: "/tags" },
];

export function FolderNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors ${
            isActive(item.href)
              ? "bg-foreground text-background font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
