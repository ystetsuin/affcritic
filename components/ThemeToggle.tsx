"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import type { Theme } from "@/lib/theme";

const cycle: Theme[] = ['dark', 'light', 'system'];
const labels: Record<Theme, string> = { light: 'Світла тема', dark: 'Темна тема', system: 'Системна' };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const next = () => {
    const i = cycle.indexOf(theme);
    setTheme(cycle[(i + 1) % cycle.length]);
  };

  // SSR/hydration: render empty placeholder until mounted
  if (!mounted) {
    return <button className="icon-btn theme-toggle" style={{ width: 32, height: 32 }} />;
  }

  return (
    <button className="icon-btn theme-toggle" onClick={next} title={labels[theme]}>
      {theme === 'light' ? (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
        </svg>
      ) : theme === 'dark' ? (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13.9 8.6a6 6 0 01-6.5-6.5A6 6 0 108 14a6 6 0 005.9-5.4z" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="12" height="9" rx="1.5" />
          <path d="M5 14h6" />
        </svg>
      )}
    </button>
  );
}
