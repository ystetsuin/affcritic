"use client";

import { ThemeToggle } from "./ThemeToggle";

export function MobileHeader() {
  return (
    <header className="m-header">
      <div className="logo">Aff<span>Critic</span></div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button className="icon-btn">
          <svg viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
