"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Search, X } from "lucide-react";

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

  const query = search.toLowerCase().trim();

  const filtered = groups
    .map((group) => ({
      ...group,
      tags: group.tags
        .filter((t) => !query || t.name.toLowerCase().includes(query) || t.aliases?.some((a) => a.toLowerCase().includes(query)))
        .sort((a, b) => b.postsCount - a.postsCount),
    }))
    .filter((group) => group.tags.length > 0);

  const toggle = (slug: string) =>
    setCollapsed((prev) => ({ ...prev, [slug]: !prev[slug] }));

  if (mode === "channels") {
    const cats = (channelCategories ?? []).filter((c) => c.channelCount > 0);
    return (
      <div className="space-y-1">
        <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Тематики
        </p>
        <button
          onClick={() => onCategorySelect?.(null)}
          className={`flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors ${
            activeCategorySlug === null
              ? "bg-muted font-medium text-foreground"
              : "text-foreground/80 hover:bg-muted hover:text-foreground"
          }`}
        >
          Всі
        </button>
        {cats.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategorySelect?.(cat.slug)}
            className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm transition-colors ${
              activeCategorySlug === cat.slug
                ? "bg-muted font-medium text-foreground"
                : "text-foreground/80 hover:bg-muted hover:text-foreground"
            }`}
          >
            <span className="truncate">{cat.name}</span>
            <span className="ml-2 shrink-0 text-xs text-muted-foreground">
              {cat.channelCount}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Пошук тегів..."
          className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Tag groups */}
      {filtered.map((group) => {
        const isCollapsed = collapsed[group.categorySlug] && !query;

        return (
          <div key={group.categorySlug}>
            <button
              onClick={() => toggle(group.categorySlug)}
              className="flex w-full items-center justify-between py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>{group.category}</span>
              <ChevronDown
                className={`size-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
              />
            </button>

            {!isCollapsed && (
              <div className="mt-1 space-y-0.5">
                {group.tags.map((tag) => (
                  <Link
                    key={tag.slug}
                    href={`/tags/${tag.slug}/`}
                    className="flex items-center justify-between rounded-sm px-2 py-1 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <span className="truncate">{tag.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {tag.postsCount}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Нічого не знайдено
        </p>
      )}
    </div>
  );
}

// ─── Mobile Drawer Wrapper ──────────────────────────────

export function SidebarDrawer({ groups, mode = "tags", channelCategories, activeCategorySlug, onCategorySelect }: SidebarProps) {
  const [open, setOpen] = useState(false);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Trigger button — visible only on mobile (lg:hidden) */}
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-input px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
      >
        {mode === "channels" ? "Тематики" : "Теги"}
      </button>

      {/* Overlay + drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-72 overflow-y-auto bg-background p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold">{mode === "channels" ? "Тематики" : "Теги"}</span>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <Sidebar
              groups={groups}
              mode={mode}
              channelCategories={channelCategories}
              activeCategorySlug={activeCategorySlug}
              onCategorySelect={(slug) => { onCategorySelect?.(slug); setOpen(false); }}
            />
          </div>
        </>
      )}
    </>
  );
}
