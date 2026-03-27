"use client";

import { useState, useEffect, useRef } from "react";

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

function translitSlug(text: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
    з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
    ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
    я: "ya", є: "ye", і: "i", ї: "yi", ґ: "g",
  };
  return text
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function PostTagEditor({ postId, currentTags, onUpdate }: PostTagEditorProps) {
  const [tags, setTags] = useState(currentTags);
  const [allTags, setAllTags] = useState<TagOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Create new tag state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCatId, setNewCatId] = useState("");
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

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentSlugs = new Set(tags.map((t) => t.tag.slug));
  const query = search.toLowerCase().trim();

  const filtered = allTags
    .filter((t) => !currentSlugs.has(t.slug))
    .filter((t) => {
      if (!query) return true;
      if (t.name.toLowerCase().includes(query)) return true;
      if (t.aliases?.some((a) => a.alias.toLowerCase().includes(query))) return true;
      return false;
    })
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
    setNewCatId(categories[0]?.id ?? "");
    setShowCreate(true);
    setShowDropdown(false);
    setSearch("");
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newCatId) return;
    setCreating(true);

    const slug = translitSlug(newName);
    const createRes = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), slug, categoryId: newCatId, status: "active" }),
    });

    if (!createRes.ok) {
      setCreating(false);
      return;
    }

    const createdTag = await createRes.json();

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
      setAllTags((prev) => [...prev, { id: createdTag.id, name: createdTag.name, slug: createdTag.slug, category: { id: newCatId, name: catName }, aliases: [] }]);
    }

    setShowCreate(false);
    setCreating(false);
  };

  return (
    <div ref={wrapperRef}>
      {/* Tag chips with remove ✕ */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: tags.length > 0 ? 8 : 0 }}>
        {tags.map((pt) => (
          <span key={pt.tag.slug} className="tag-admin">
            {pt.tag.name}
            <button className="tag-remove" onClick={() => handleRemove(pt.tag.slug)} title="Видалити тег">×</button>
          </span>
        ))}
      </div>

      {/* Add tag input + create row */}
      {showCreate ? (
        <div className="create-tag-row">
          <input
            className="add-tag-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Назва тега"
          />
          <select value={newCatId} onChange={(e) => setNewCatId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className="create-btn" onClick={handleCreate} disabled={creating || !newName.trim()}>
            {creating ? "..." : "Створити"}
          </button>
          <button className="cancel-btn" onClick={() => setShowCreate(false)}>×</button>
        </div>
      ) : (
        <div style={{ position: "relative", display: "inline-block" }}>
          <input
            className="add-tag-input"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Додати тег..."
          />
          {showDropdown && (filtered.length > 0 || (query && !hasExactMatch)) && (
            <div className="add-tag-dropdown">
              {filtered.map((t) => (
                <button key={t.id} className="add-tag-option" onClick={() => handleAdd(t)}>
                  <span>{t.name}</span>
                  <span className="cat-badge">{t.category.name}</span>
                </button>
              ))}
              {query && !hasExactMatch && (
                <button className="add-tag-option create" onClick={handleStartCreate}>
                  + Новий тег &laquo;{search}&raquo;
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
