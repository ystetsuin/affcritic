"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface TagFilterState {
  selectedSlugs: string[];
  toggle: (slug: string) => void;
  reset: () => void;
}

const TagFilterContext = createContext<TagFilterState>({
  selectedSlugs: [],
  toggle: () => {},
  reset: () => {},
});

export function TagFilterProvider({ children }: { children: ReactNode }) {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  const toggle = useCallback((slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }, []);

  const reset = useCallback(() => setSelectedSlugs([]), []);

  return (
    <TagFilterContext.Provider value={{ selectedSlugs, toggle, reset }}>
      {children}
    </TagFilterContext.Provider>
  );
}

export function useTagFilter() {
  return useContext(TagFilterContext);
}
