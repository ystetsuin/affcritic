"use client";

import { useState, useEffect } from "react";
import { useTagFilter } from "./TagFilterContext";

interface TagItem {
  name: string;
  slug: string;
  aliases: string[];
  postsCount: number;
}

interface TagGroup {
  category: string;
  categorySlug: string;
  tags: TagItem[];
}

interface ChannelCategoryItem {
  id: string;
  name: string;
  slug: string;
  channelCount: number;
}

interface SidebarProps {
  groups: TagGroup[];
  mode?: "tags" | "channels";
  channelCategories?: ChannelCategoryItem[];
  activeCategorySlug?: string | null;
  onCategorySelect?: (categorySlug: string | null) => void;
}

export function Sidebar({ groups, mode = "tags", channelCategories, activeCategorySlug, onCategorySelect }: SidebarProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { selectedSlugs, toggle } = useTagFilter();

  const query = search.toLowerCase().trim();

  const filtered = groups
    .map((group) => ({
      ...group,
      tags: group.tags
        .filter((t) => !query || t.name.toLowerCase().includes(query) || t.aliases?.some((a) => a.toLowerCase().includes(query)))
        .sort((a, b) => b.postsCount - a.postsCount),
    }))
    .filter((group) => group.tags.length > 0);

  const toggleCollapse = (slug: string) =>
    setCollapsed((prev) => ({ ...prev, [slug]: !prev[slug] }));

  if (mode === "channels") {
    const cats = (channelCategories ?? []).filter((c) => c.channelCount > 0);
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 10, padding: "0 4px" }}>
          Тематики
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <button
            onClick={() => onCategorySelect?.(null)}
            className={`sidebar-tag ${activeCategorySlug === null ? "checked" : ""}`}
          >
            <span className="sidebar-tag-name">Всі</span>
          </button>
          {cats.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategorySelect?.(cat.slug)}
              className={`sidebar-tag ${activeCategorySlug === cat.slug ? "checked" : ""}`}
            >
              <span className="sidebar-tag-name">{cat.name}</span>
              <span className="sidebar-tag-count">{cat.channelCount}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="sidebar-search">
        <svg viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" />
          <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Пошук тегів..."
        />
      </div>

      {/* Tag groups */}
      {filtered.map((group) => {
        const isCollapsed = collapsed[group.categorySlug] && !query;

        return (
          <div key={group.categorySlug} style={{ marginBottom: 16 }}>
            <div
              className="sidebar-cat-header"
              onClick={() => toggleCollapse(group.categorySlug)}
            >
              <span className="sidebar-cat-name">{group.category}</span>
              <span
                className="sidebar-cat-toggle"
                style={isCollapsed ? { transform: "rotate(-90deg)" } : undefined}
              >
                ▾
              </span>
            </div>

            {!isCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {group.tags.map((tag) => {
                  const checked = selectedSlugs.includes(tag.slug);
                  return (
                    <label
                      key={tag.slug}
                      className={`sidebar-tag${checked ? " checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        className="tag-cb"
                        checked={checked}
                        onChange={() => toggle(tag.slug)}
                      />
                      <span className="sidebar-tag-name">{tag.name}</span>
                      <span className="sidebar-tag-count">{tag.postsCount}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", padding: "16px 0" }}>
          Нічого не знайдено
        </p>
      )}
    </div>
  );
}

// ─── Mobile Filter Overlay ──────────────────────────────

export function SidebarDrawer({ groups, mode = "tags", channelCategories, activeCategorySlug, onCategorySelect }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const { selectedSlugs, toggle, reset } = useTagFilter();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (mode === "channels") {
    return (
      <>
        <button onClick={() => setOpen(true)} className="icon-btn lg:hidden" style={{ position: "relative" }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1.5 2h13l-5 6.5V13l-3 1.5V8.5L1.5 2z" />
          </svg>
        </button>
        {open && (
          <div className="m-filter-overlay">
            <div className="m-filter-header">
              <span className="m-filter-title">Тематики</span>
              <button className="m-filter-close" onClick={() => setOpen(false)}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
            <div className="m-filter-body">
              <Sidebar
                groups={groups}
                mode={mode}
                channelCategories={channelCategories}
                activeCategorySlug={activeCategorySlug}
                onCategorySelect={(slug) => { onCategorySelect?.(slug); setOpen(false); }}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  const filterCount = selectedSlugs.length;

  return (
    <>
      <button onClick={() => setOpen(true)} className="m-filter-icon" style={{ position: "relative" }}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 2h13l-5 6.5V13l-3 1.5V8.5L1.5 2z" />
        </svg>
        {filterCount > 0 && (
          <span className="m-filter-badge">{filterCount}</span>
        )}
      </button>
      {open && (
        <div className="m-filter-overlay">
          <div className="m-filter-chrome" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div className="m-filter-header">
              <span className="m-filter-title">Фільтри</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {filterCount > 0 && (
                  <button className="m-filter-reset" onClick={reset}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 2l12 12M14 2L2 14" />
                    </svg>
                    Скинути
                  </button>
                )}
                <button className="m-filter-close" onClick={() => setOpen(false)}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="m-filter-body" style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px" }}>
              {groups.map((group) => (
                <div key={group.categorySlug} style={{ marginBottom: 20 }}>
                  <div className="m-filter-cat-name">{group.category}</div>
                  <div className="m-filter-tags">
                    {group.tags
                      .filter((t) => t.postsCount > 0)
                      .sort((a, b) => b.postsCount - a.postsCount)
                      .map((tag) => {
                        const checked = selectedSlugs.includes(tag.slug);
                        return (
                          <label
                            key={tag.slug}
                            className={`m-filter-tag${checked ? " selected" : ""}`}
                          >
                            <input
                              type="checkbox"
                              className="m-tag-cb"
                              checked={checked}
                              onChange={() => toggle(tag.slug)}
                              style={{ display: "none" }}
                            />
                            <span>{tag.name}</span>
                            <span className="m-ftag-count">{tag.postsCount}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
