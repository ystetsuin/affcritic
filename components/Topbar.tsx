"use client";

import { ThemeToggle } from "./ThemeToggle";
import { useAdmin } from "./AdminContext";

export function Topbar() {
  const isAdmin = useAdmin();

  return (
    <header className="d-topbar">
      <div className="d-topbar-inner">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 32, flexShrink: 0 }}>
          <div className="logo">
            Aff<span>Critic</span>
          </div>
          {isAdmin && <span className="admin-badge">Admin</span>}
        </div>

        {/* FolderNav placeholder — empty per mockup */}
        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <div className="d-search">
            <svg viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input type="text" placeholder="Пошук..." />
          </div>
          <a href="#" className="cta-btn">Додати канал</a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
