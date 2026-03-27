"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    name: "Стрічка",
    href: "/",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="6" height="6" rx="1.5" />
        <rect x="11" y="3" width="6" height="6" rx="1.5" />
        <rect x="3" y="11" width="6" height="6" rx="1.5" />
        <rect x="11" y="11" width="6" height="6" rx="1.5" />
      </svg>
    ),
  },
  {
    name: "Теми",
    href: "/topics",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M3 5h14M3 10h14M3 15h8" />
      </svg>
    ),
  },
  {
    name: "Канали",
    href: "/channels",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="14" height="10" rx="2" />
        <path d="M7 13v3M13 13v3M5 16h10" />
      </svg>
    ),
  },
  {
    name: "Про нас",
    href: "/about",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 9v5" />
        <circle cx="10" cy="6.5" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
];

export function LeftNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="d-nav">
      <div className="d-nav-inner">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`d-nav-item ${active ? "active" : ""}`}
            >
              <div
                className={`d-nav-icon ${active ? "d-nav-icon-active" : "d-nav-icon-inactive"}`}
              >
                {item.icon}
              </div>
              <span className="d-nav-label">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
