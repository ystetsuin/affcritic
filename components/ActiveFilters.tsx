"use client";

import { useTagFilter } from "./TagFilterContext";

export function ActiveFilters() {
  const { selectedSlugs, reset } = useTagFilter();
  const count = selectedSlugs.length;

  if (count === 0) return null;

  return (
    <div className="active-filters">
      <span className="af-count">{count}</span>
      <span className="af-label">{count === 1 ? "фільтр" : "фільтри"}</span>
      <button className="af-reset" onClick={reset} title="Скинути фільтри">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3h10l-1 9H4L3 3z" />
          <path d="M1 3h14" />
          <path d="M6 3V2h4v1" />
          <path d="M6 7v4M10 7v4" />
        </svg>
      </button>
    </div>
  );
}
