"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { type Theme, getStoredTheme, setStoredTheme, getResolvedTheme } from "@/lib/theme";

interface ThemeContextValue {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolved: 'dark',
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('light', resolved === 'light');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('dark');

  // Init from localStorage
  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    const r = getResolvedTheme(stored);
    setResolved(r);
    applyTheme(r);
  }, []);

  // Listen for OS theme changes when in system mode
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      if (theme !== 'system') return;
      const r = getResolvedTheme('system');
      setResolved(r);
      applyTheme(r);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    setStoredTheme(t);
    const r = getResolvedTheme(t);
    setResolved(r);
    applyTheme(r);
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
