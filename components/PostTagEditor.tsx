"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface PostTag {
  tag: {
    name: string;
    slug: string;
    category: { name: string; slug: string };
  };
}

interface TagOption {
  id: string;
  name: string;
  slug: string;
  aliases: { alias: string }[];
  category: { id: string; name: string };
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface PostTagEditorProps {
  postId: string;
  currentTags: PostTag[];
  onUpdate: (tags: PostTag[]) => void;
}

// ─── Transliteration ────────────────────────────────────

const TRANSLIT_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya", є: "ye", і: "i", ї: "yi", ґ: "g",
};

function translitSlug(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT_MAP[ch] ?? ch)
    .join("")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

// ─── Component ──────────────────────────────────────────

export function PostTagEditor({ postId, currentTags, onUpdate }: PostTagEditorProps) {
  const [tags, setTags] = useState(currentTags);
  const [allTags, setAllTags] = useState<TagOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Create new tag state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newCatId, setNewCatId] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/tags?status=active").then((r) => r.json()),
      fetch("/api/tag-categories").then((r) => r.json()),
    ]).then(([tagsData, catsData]) => {
      setAllTags(tagsData);
      setCategories(catsData);
    });
  }, []);

  const currentSlugs = new Set(tags.map((t) => t.tag.slug));
  const query = search.toLowerCase().trim();
  const matchesSearch = (t: TagOption) => {
    if (!query) return true;
    if (t.name.toLowerCase().includes(query)) return true;
    if (t.aliases?.some((a) => a.alias.toLowerCase().includes(query))) return true;
    return false;
  };

  const filtered = allTags
    .filter((t) => !currentSlugs.has(t.slug))
    .filter(matchesSearch)
    .slice(0, 8);

  const hasExactMatch = query && allTags.some(
    (t) => t.name.toLowerCase() === query || t.aliases?.some((a) => a.alias.toLowerCase() === query),
  );

  const handleAdd = async (tag: TagOption) => {
    const res = await fetch(`/api/posts/${postId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId: tag.id }),
    });
    if (res.ok) {
      const newTags = [
        ...tags,
        { tag: { name: tag.name, slug: tag.slug, category: { name: tag.category.name, slug: "" } } },
      ];
      setTags(newTags);
      onUpdate(newTags);
    }
    setSearch("");
    setShowDropdown(false);
  };

  const handleRemove = async (slug: string) => {
    const tag = allTags.find((t) => t.slug === slug);
    if (!tag) return;
    const res = await fetch(`/api/posts/${postId}/tags?tagId=${tag.id}`, { method: "DELETE" });
    if (res.ok) {
      const newTags = tags.filter((t) => t.tag.slug !== slug);
      setTags(newTags);
      onUpdate(newTags);
    }
  };

  const handleStartCreate = () => {
    setNewName(search);
    setNewSlug(translitSlug(search));
    setNewCatId(categories[0]?.id ?? "");
    setCreateError("");
    setShowCreate(true);
    setShowDropdown(false);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newSlug.trim() || !newCatId) return;
    setCreating(true);
    setCreateError("");

    // 1. Create tag
    const createRes = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim(), categoryId: newCatId, status: "active" }),
    });

    if (!createRes.ok) {
      const data = await createRes.json();
      setCreateError(data.error || "Failed to create tag");
      setCreating(false);
      return;
    }

    const createdTag = await createRes.json();

    // 2. Attach to post
    const attachRes = await fetch(`/api/posts/${postId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId: createdTag.id }),
    });

    if (attachRes.ok) {
      const catName = categories.find((c) => c.id === newCatId)?.name ?? "";
      const newTags = [
        ...tags,
        { tag: { name: createdTag.name, slug: createdTag.slug, category: { name: catName, slug: "" } } },
      ];
      setTags(newTags);
      onUpdate(newTags);
      // Add to allTags so it appears in future autocomplete
      setAllTags((prev) => [...prev, { id: createdTag.id, name: createdTag.name, slug: createdTag.slug, category: { id: newCatId, name: catName } }]);
    }

    setShowCreate(false);
    setSearch("");
    setCreating(false);
  };

  return (
    <div>
      {/* Current tags with remove */}
      <div className="flex flex-wrap gap-1.5">
        {tags.map((pt) => (
          <span
            key={pt.tag.slug}
            className="inline-flex items-center gap-1 rounded-sm border border-border/60 bg-muted/50 px-2 py-0.5 text-xs"
          >
            <span className="text-foreground/40">{pt.tag.category.name}:</span>
            {pt.tag.name}
            <button
              onClick={() => handleRemove(pt.tag.slug)}
              className="ml-0.5 text-destructive hover:text-destructive/80"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Create new tag inline form */}
      {showCreate ? (
        <div className="mt-2 rounded border border-border bg-muted/20 p-2.5">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Новий тег</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <input
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setNewSlug(translitSlug(e.target.value)); }}
                placeholder="Назва"
                className="h-7 w-full rounded border border-input bg-background px-2 text-xs focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                slug: {newSlug || "—"}
              </div>
            </div>
            <select
              value={newCatId}
              onChange={(e) => setNewCatId(e.target.value)}
              className="h-7 rounded border border-input bg-background px-2 text-xs"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex gap-1">
              <Button size="xs" onClick={handleCreate} disabled={creating || !newName.trim() || !newCatId}>
                {creating ? "..." : "Створити"}
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setShowCreate(false)}>×</Button>
            </div>
          </div>
          {createError && <p className="mt-1 text-xs text-destructive">{createError}</p>}
        </div>
      ) : (
        /* Add tag autocomplete */
        <div className="relative mt-2">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Додати тег..."
            className="h-7 w-48 rounded-md border border-input bg-background px-2 text-xs focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {showDropdown && (filtered.length > 0 || (query && !hasExactMatch)) && (
            <div className="absolute left-0 top-8 z-10 max-h-48 w-64 overflow-y-auto rounded-md border border-border bg-background shadow-lg">
              {filtered.map((t) => {
                const matchedAlias = query && !t.name.toLowerCase().includes(query)
                  ? t.aliases?.find((a) => a.alias.toLowerCase().includes(query))?.alias
                  : null;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleAdd(t)}
                    className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted"
                  >
                    <span>{t.name}</span>
                    {matchedAlias && <span className="italic text-muted-foreground/70">({matchedAlias})</span>}
                    <span className="text-muted-foreground">{t.category.name}</span>
                  </button>
                );
              })}
              {query && !hasExactMatch && (
                <button
                  onClick={handleStartCreate}
                  className="flex w-full items-baseline gap-2 border-t border-border px-3 py-1.5 text-left text-xs text-emerald-700 hover:bg-emerald-50"
                >
                  + Створити &quot;{search}&quot;
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
