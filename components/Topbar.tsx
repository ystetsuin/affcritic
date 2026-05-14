"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { useAdmin } from "./AdminContext";

const NAV_ITEMS = [
  { name: "Стрічка", href: "/" },
  { name: "Теми", href: "/topics" },
  { name: "Канали", href: "/channels" },
];

export function Topbar() {
  const isAdmin = useAdmin();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="d-topbar">
      <div className="d-topbar-inner">
        <div style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
          <div className="logo">
            Aff<span>Critic</span>
          </div>
          {isAdmin && <span className="admin-badge" style={{ marginLeft: 8 }}>Admin</span>}
        </div>

        <nav className="topbar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`topbar-link${isActive(item.href) ? " active" : ""}`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="d-search">
            <svg viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input type="text" placeholder="Пошук..." />
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
