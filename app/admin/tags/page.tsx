"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface TagCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  tagsCount: number;
}

interface TagAlias {
  id: string;
  alias: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  status: "active" | "pending";
  category: { id: string; name: string; slug: string };
  aliases: TagAlias[];
  postsCount: number;
}

export default function AdminTagsPage() {
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const [catRes, tagsRes] = await Promise.all([
        fetch("/api/tag-categories"),
        fetch("/api/tags"),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (tagsRes.ok) setTags(await tagsRes.json());
    } catch (err) {
      console.error("[admin/tags] fetchData error:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pendingTags = tags.filter((t) => t.status === "pending");
  const activeTags = tags.filter((t) => t.status === "active");
  const groupedActive = categories.map((cat) => ({
    ...cat,
    tags: activeTags.filter((t) => t.category.id === cat.id).sort((a, b) => b.postsCount - a.postsCount),
  }));

  const toggleTag = useCallback((id: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((tagIds: string[]) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      const allSelected = tagIds.every((id) => prev.has(id));
      if (allSelected) {
        tagIds.forEach((id) => next.delete(id));
      } else {
        tagIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedTagIds(new Set()), []);

  // Escape clears selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedTagIds.size > 0) clearSelection();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedTagIds.size, clearSelection]);

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-6 text-sm text-muted-foreground">Завантаження...</div>;

  return (
    <div className={`mx-auto max-w-4xl px-4 py-6 space-y-8 ${selectedTagIds.size > 0 ? "pb-20" : ""}`}>
      <h1 className="text-xl font-bold">Теги</h1>

      {/* Pending section */}
      {pendingTags.length > 0 && (
        <PendingSection tags={pendingTags} categories={categories} allTags={activeTags} onRefresh={fetchData} />
      )}

      {/* Tag categories CRUD */}
      <CategoriesSection categories={categories} onRefresh={fetchData} />

      {/* Active tags by category */}
      <ActiveTagsSection
        groups={groupedActive}
        categories={categories}
        allTags={activeTags}
        onRefresh={fetchData}
        selectedTagIds={selectedTagIds}
        onToggleTag={toggleTag}
        onToggleGroup={toggleGroup}
        onClearSelection={clearSelection}
      />

      {/* Bulk toolbar */}
      {selectedTagIds.size > 0 && (
        <BulkToolbar
          selectedTags={activeTags.filter((t) => selectedTagIds.has(t.id))}
          categories={categories}
          onMove={async (categoryId) => {
            const res = await fetch("/api/tags/bulk-move", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tagIds: Array.from(selectedTagIds), categoryId }),
            });
            if (res.ok) { clearSelection(); fetchData(); }
          }}
          onMerge={async (targetId) => {
            const sourceIds = Array.from(selectedTagIds).filter((id) => id !== targetId);
            const res = await fetch("/api/tags/bulk-merge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sourceIds, targetId }),
            });
            if (res.ok) { clearSelection(); fetchData(); }
          }}
          onDelete={async () => {
            const res = await fetch("/api/tags/bulk-delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tagIds: Array.from(selectedTagIds) }),
            });
            if (res.ok) { clearSelection(); fetchData(); }
          }}
          onCancel={clearSelection}
        />
      )}
    </div>
  );
}

// ─── Bulk Move Toolbar ─────────────────────────────────

function BulkToolbar({ selectedTags, categories, onMove, onMerge, onDelete, onCancel }: {
  selectedTags: Tag[];
  categories: TagCategory[];
  onMove: (categoryId: string) => Promise<void>;
  onMerge: (targetId: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onCancel: () => void;
}) {
  const count = selectedTags.length;
  const [targetCatId, setTargetCatId] = useState("");
  const [busy, setBusy] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  const targetCatName = categories.find((c) => c.id === targetCatId)?.name;

  const handleMove = async () => {
    if (!targetCatId) return;
    if (!confirm(`Перемістити ${count} тегів в категорію "${targetCatName}"?`)) return;
    setBusy(true);
    await onMove(targetCatId);
    setBusy(false);
    setTargetCatId("");
  };

  const handleMergeSelect = async (targetId: string) => {
    const target = selectedTags.find((t) => t.id === targetId);
    if (!target) return;
    if (!confirm(`Об'єднати ${count - 1} тегів в "${target.name}"? Всі пости та аліаси будуть перенесені.`)) return;
    setBusy(true);
    setShowMergeDialog(false);
    await onMerge(targetId);
    setBusy(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Видалити ${count} тегів? Всі прив'язки до постів будуть видалені.`)) return;
    setBusy(true);
    await onDelete();
    setBusy(false);
  };

  return (
    <>
      {/* Merge target dialog */}
      {showMergeDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setShowMergeDialog(false)}>
          <div className="mx-4 w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-semibold">Оберіть головний тег</h3>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {selectedTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleMergeSelect(tag.id)}
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="font-medium">{tag.name}</span>
                  <span className="text-xs text-muted-foreground">{tag.category.name} · {tag.postsCount} постів</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setShowMergeDialog(false)}>Скасувати</Button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
          <span className="text-sm font-medium">{count} тегів вибрано</span>

          {/* Move */}
          <select
            value={targetCatId}
            onChange={(e) => setTargetCatId(e.target.value)}
            className="h-7 rounded border border-input bg-background px-2 text-sm"
          >
            <option value="" disabled>Категорія...</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button size="sm" onClick={handleMove} disabled={!targetCatId || busy}>
            Перемістити
          </Button>

          <span className="text-border">|</span>

          {/* Merge */}
          <Button size="sm" variant="outline" onClick={() => setShowMergeDialog(true)} disabled={count < 2 || busy}>
            Об&apos;єднати
          </Button>

          {/* Delete */}
          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={busy}>
            Видалити
          </Button>

          <Button size="sm" variant="ghost" onClick={onCancel}>Скасувати</Button>
        </div>
      </div>
    </>
  );
}

// ─── Tag Merge Autocomplete ────────────────────────────

function TagMergeAutocomplete({ tags, excludeId, onMerge, onCancel }: {
  tags: Tag[];
  excludeId: string;
  onMerge: (targetId: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onCancel();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onCancel]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const candidates = tags.filter((t) => t.id !== excludeId);
    if (!q) return candidates.slice(0, 8);
    return candidates
      .filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.aliases.some((a) => a.alias.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [tags, excludeId, q]);

  const handleSelect = (target: Tag) => {
    const sourceName = tags.find((t) => t.id === excludeId)?.name ?? "тег";
    if (!confirm(`Об'єднати "${sourceName}" в "${target.name}"? Всі пости будуть перенесені.`)) return;
    onMerge(target.id);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Знайти тег..."
        className="h-6 w-40 rounded border border-input bg-background px-2 text-xs"
      />
      <div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-64 overflow-y-auto rounded border border-border bg-background shadow-lg">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">Нічого не знайдено</div>
        ) : (
          filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelect(t)}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-muted"
            >
              <span className="font-medium">{t.name}</span>
              <span className="text-muted-foreground">{t.category.name} · {t.postsCount}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Pending Section ────────────────────────────────────

function PendingSection({ tags, categories, allTags, onRefresh }: {
  tags: Tag[];
  categories: TagCategory[];
  allTags: Tag[];
  onRefresh: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);

  const handleApprove = async (tag: Tag) => {
    if (editingId === tag.id) {
      // Approve with edits
      await fetch(`/api/tags/${tag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), slug: editSlug.trim() }),
      });
      setEditingId(null);
    }
    await fetch(`/api/tags/${tag.id}/approve`, { method: "POST" });
    onRefresh();
  };

  const handleReject = async (tag: Tag) => {
    if (!confirm(`Видалити pending тег "${tag.name}"? Post_tags будуть видалені.`)) return;
    await fetch(`/api/tags/${tag.id}/reject`, { method: "POST" });
    onRefresh();
  };

  const handleMerge = async (sourceId: string, targetId: string) => {
    await fetch("/api/tags/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, targetId }),
    });
    setMergeTarget(null);
    onRefresh();
  };

  return (
    <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/10 light:border-amber-200 light:bg-amber-50/50 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase text-amber-400 light:text-amber-700">
        Pending ({tags.length})
      </h2>
      <div className="space-y-2">
        {tags.map((tag) => (
          <div key={tag.id} className="flex flex-col gap-2 rounded border border-amber-500/30 light:border-amber-200 bg-background p-3 sm:flex-row sm:items-center">
            {editingId === tag.id ? (
              <div className="flex flex-1 gap-2">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 flex-1 rounded border border-input bg-background px-2 text-sm" />
                <input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className="h-7 w-32 rounded border border-input bg-background px-2 font-mono text-sm" />
              </div>
            ) : (
              <div className="flex flex-1 items-baseline gap-2">
                <span className="font-medium">{tag.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{tag.slug}</span>
                <span className="text-xs text-muted-foreground">{tag.category.name}</span>
                <span className="text-xs text-muted-foreground">({tag.postsCount} постів)</span>
              </div>
            )}
            <div className="flex gap-1">
              {editingId !== tag.id && (
                <Button size="xs" variant="ghost" onClick={() => { setEditingId(tag.id); setEditName(tag.name); setEditSlug(tag.slug); }}>
                  Ред.
                </Button>
              )}
              <Button size="xs" onClick={() => handleApprove(tag)}>Approve</Button>
              <Button size="xs" variant="destructive" onClick={() => handleReject(tag)}>Reject</Button>
              {mergeTarget === tag.id ? (
                <TagMergeAutocomplete
                  tags={allTags}
                  excludeId={tag.id}
                  onMerge={(targetId) => handleMerge(tag.id, targetId)}
                  onCancel={() => setMergeTarget(null)}
                />
              ) : (
                <Button size="xs" variant="ghost" onClick={() => setMergeTarget(tag.id)}>Merge</Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Categories Section ─────────────────────────────────

function CategoriesSection({ categories, onRefresh }: { categories: TagCategory[]; onRefresh: () => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editError, setEditError] = useState("");

  // Local order for optimistic DnD
  const [localOrder, setLocalOrder] = useState(categories);
  useEffect(() => { setLocalOrder(categories); }, [categories]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const startEdit = (cat: TagCategory) => {
    setEditId(cat.id); setEditName(cat.name); setEditSlug(cat.slug); setEditError("");
  };

  const handleEdit = async (id: string) => {
    setEditError("");
    const res = await fetch(`/api/tag-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), slug: editSlug.trim() }),
    });
    if (!res.ok) { setEditError((await res.json()).error); return; }
    setEditId(null);
    onRefresh();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/tag-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setName(""); setSlug(""); setShowCreate(false);
    onRefresh();
  };

  const handleDelete = async (cat: TagCategory) => {
    if (!confirm(`Видалити категорію "${cat.name}"? Всі теги в ній будуть видалені.`)) return;
    await fetch(`/api/tag-categories/${cat.id}`, { method: "DELETE" });
    onRefresh();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localOrder.findIndex((c) => c.id === active.id);
    const newIndex = localOrder.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(localOrder, oldIndex, newIndex);

    // Optimistic update
    setLocalOrder(reordered);

    // Persist
    await fetch("/api/tag-categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((c) => c.id) }),
    });
    onRefresh();
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Категорії тегів</h2>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "×" : "Додати"}
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-3 flex flex-col gap-2 rounded border border-border p-3 sm:flex-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Назва" required className="h-7 rounded border border-input bg-background px-2 text-sm" />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Slug" required className="h-7 rounded border border-input bg-background px-2 font-mono text-sm" />
          <Button size="sm" type="submit">OK</Button>
          {error && <span className="text-xs text-destructive">{error}</span>}
        </form>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localOrder.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {localOrder.map((cat) => (
              <SortableCategoryRow
                key={cat.id}
                cat={cat}
                isEditing={editId === cat.id}
                editName={editName}
                editSlug={editSlug}
                editError={editError}
                onEditNameChange={setEditName}
                onEditSlugChange={setEditSlug}
                onStartEdit={() => startEdit(cat)}
                onSaveEdit={() => handleEdit(cat.id)}
                onCancelEdit={() => setEditId(null)}
                onDelete={() => handleDelete(cat)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableCategoryRow({ cat, isEditing, editName, editSlug, editError, onEditNameChange, onEditSlugChange, onStartEdit, onSaveEdit, onCancelEdit, onDelete }: {
  cat: TagCategory;
  isEditing: boolean;
  editName: string;
  editSlug: string;
  editError: string;
  onEditNameChange: (v: string) => void;
  onEditSlugChange: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded px-1 py-1.5 text-sm hover:bg-muted/50">
      {isEditing ? (
        <div className="flex flex-col gap-2 px-2 sm:flex-row sm:items-center">
          <input value={editName} onChange={(e) => onEditNameChange(e.target.value)} className="h-7 rounded border border-input bg-background px-2 text-sm" placeholder="Name" />
          <input value={editSlug} onChange={(e) => onEditSlugChange(e.target.value)} className="h-7 w-32 rounded border border-input bg-background px-2 font-mono text-sm" placeholder="Slug" />
          <div className="flex gap-1">
            <Button size="sm" onClick={onSaveEdit}>Зберегти</Button>
            <Button size="sm" variant="ghost" onClick={onCancelEdit}>×</Button>
          </div>
          {editError && <span className="text-xs text-destructive">{editError}</span>}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing">
            <GripVertical className="size-4" />
          </button>
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="font-medium">{cat.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{cat.slug}</span>
              <span className="text-xs text-muted-foreground">{cat.tagsCount} тегів</span>
            </div>
            <div className="flex gap-2">
              <button onClick={onStartEdit} className="text-xs text-muted-foreground hover:text-foreground">Ред.</button>
              <button onClick={onDelete} className="text-xs text-destructive hover:underline">Видалити</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Active Tags Section ────────────────────────────────

type SortMode = "newest" | "alpha";

function ActiveTagsSection({ groups, categories, allTags, onRefresh, selectedTagIds, onToggleTag, onToggleGroup, onClearSelection }: {
  groups: (TagCategory & { tags: Tag[] })[];
  categories: TagCategory[];
  allTags: Tag[];
  onRefresh: () => void;
  selectedTagIds: Set<string>;
  onToggleTag: (id: string) => void;
  onToggleGroup: (tagIds: string[]) => void;
  onClearSelection: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newCatId, setNewCatId] = useState("");
  const [createError, setCreateError] = useState("");
  const [mergeSource, setMergeSource] = useState<string | null>(null);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editCatId, setEditCatId] = useState("");
  const [editError, setEditError] = useState("");

  // Navigation state
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  // Alias state
  const [aliasTagId, setAliasTagId] = useState<string | null>(null);
  const [newAlias, setNewAlias] = useState("");
  const [aliasError, setAliasError] = useState("");

  const handleAddAlias = async (tagId: string) => {
    if (!newAlias.trim()) return;
    setAliasError("");
    const res = await fetch(`/api/tags/${tagId}/aliases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias: newAlias.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      setAliasError(data.error || "Failed to add alias");
      return;
    }
    setNewAlias("");
    onRefresh();
  };

  const handleDeleteAlias = async (tagId: string, aliasId: string) => {
    await fetch(`/api/tags/${tagId}/aliases?aliasId=${aliasId}`, { method: "DELETE" });
    onRefresh();
  };

  const startEditTag = (tag: Tag) => {
    setEditId(tag.id); setEditName(tag.name); setEditSlug(tag.slug); setEditCatId(tag.category.id); setEditError("");
  };

  const handleEditTag = async (id: string) => {
    setEditError("");
    const res = await fetch(`/api/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), slug: editSlug.trim(), categoryId: editCatId }),
    });
    if (!res.ok) { setEditError((await res.json()).error); return; }
    setEditId(null);
    onRefresh();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim(), categoryId: newCatId, status: "active" }),
    });
    if (!res.ok) { setCreateError((await res.json()).error); return; }
    setNewName(""); setNewSlug(""); setNewCatId(""); setShowCreate(false);
    onRefresh();
  };

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`Видалити тег "${tag.name}"? ${tag.postsCount} post_tags будуть видалені.`)) return;
    await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
    onRefresh();
  };

  const handleMerge = async (sourceId: string, targetId: string) => {
    await fetch("/api/tags/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, targetId }),
    });
    setMergeSource(null);
    onRefresh();
  };

  // Reset selection when filters change
  useEffect(() => { onClearSelection(); }, [search, sortMode, activeLetter, onClearSelection]);

  const isSearching = search.trim().length > 0;
  const searchLower = search.trim().toLowerCase();

  const isFiltering = isSearching || activeLetter !== null;

  // Filter + sort tags per group
  const filteredGroups = useMemo(() => {
    return groups.map((group) => {
      let tags = group.tags;

      // Filter by search
      if (isSearching) {
        tags = tags.filter((t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.aliases.some((a) => a.alias.toLowerCase().includes(searchLower))
        );
      }

      // Filter by letter
      if (activeLetter) {
        tags = tags.filter((t) =>
          t.name.charAt(0).toUpperCase() === activeLetter ||
          t.aliases.some((a) => a.alias.charAt(0).toUpperCase() === activeLetter)
        );
      }

      // Sort
      if (sortMode === "alpha") {
        tags = [...tags].sort((a, b) => a.name.localeCompare(b.name, "uk"));
      }

      return { ...group, tags };
    }).filter((g) => !isFiltering || g.tags.length > 0);
  }, [groups, sortMode, isSearching, searchLower, activeLetter, isFiltering]);

  // Alphabet index — based on all tags (not filtered by letter)
  const alphabetLetters = useMemo(() => {
    const allTags = groups.flatMap((g) => g.tags);
    const usedLetters = new Set<string>();
    for (const t of allTags) {
      if (t.name[0]) usedLetters.add(t.name[0].toUpperCase());
      for (const a of t.aliases) {
        if (a.alias[0]) usedLetters.add(a.alias[0].toUpperCase());
      }
    }
    const latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const cyrillic = "АБВГДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ".split("");
    return [...latin, ...cyrillic].map((letter) => ({
      letter,
      active: usedLetters.has(letter),
    }));
  }, [groups]);

  const handleLetterClick = (letter: string) => {
    setActiveLetter((prev) => prev === letter ? null : letter);
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Active теги</h2>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "×" : "Додати тег"}
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-3 flex flex-col gap-2 rounded border border-border p-3 sm:flex-row">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Назва" required className="h-7 rounded border border-input bg-background px-2 text-sm" />
          <input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="Slug" required className="h-7 rounded border border-input bg-background px-2 font-mono text-sm" />
          <select value={newCatId} onChange={(e) => setNewCatId(e.target.value)} required className="h-7 rounded border border-input bg-background px-2 text-sm">
            <option value="" disabled>Категорія</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button size="sm" type="submit">OK</Button>
          {createError && <span className="text-xs text-destructive">{createError}</span>}
        </form>
      )}

      {/* Search + Sort controls */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук по тегах..."
            className="h-7 w-full rounded border border-input bg-background px-2 pr-7 text-sm sm:w-64"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {(["newest", "alpha"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                sortMode === mode
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {mode === "newest" ? "Новіші" : "А-Я"}
            </button>
          ))}
        </div>
      </div>

      {/* Alphabet index */}
      {alphabetLetters.length > 0 && (
        <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-0.5 rounded bg-background/95 py-1 backdrop-blur">
          {activeLetter && (
            <button
              onClick={() => setActiveLetter(null)}
              className="mr-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Всі
            </button>
          )}
          {alphabetLetters.map(({ letter, active }) => (
            <button
              key={letter}
              disabled={!active}
              onClick={() => handleLetterClick(letter)}
              className={`size-6 rounded text-[10px] font-medium transition-colors ${
                activeLetter === letter
                  ? "bg-foreground text-background"
                  : active
                    ? "text-foreground hover:bg-muted"
                    : "cursor-default text-muted-foreground/30"
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      {filteredGroups.map((group) => {
        const isCollapsed = !isFiltering && collapsed.has(group.id);
        return (
        <div key={group.id} className="mb-4">
          <div className="mb-1 flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={group.tags.length > 0 && group.tags.every((t) => selectedTagIds.has(t.id))}
              onChange={() => onToggleGroup(group.tags.map((t) => t.id))}
              className="size-4 shrink-0 accent-current"
              title="Виділити всі в категорії"
            />
            <button
              onClick={() => toggleCollapse(group.id)}
              className="flex items-center gap-1.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              <span className="text-[10px]">{isCollapsed ? "▶" : "▼"}</span>
              {group.name}
              <span className="font-normal">({group.tags.length})</span>
            </button>
          </div>
          {!isCollapsed && (
          <div className="space-y-0.5">
            {group.tags.map((tag) => (
              <div key={tag.id} className="flex items-start gap-1.5 rounded px-3 py-1 text-sm hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={selectedTagIds.has(tag.id)}
                  onChange={() => onToggleTag(tag.id)}
                  className="mt-1 size-4 shrink-0 accent-current"
                />
                <div className="min-w-0 flex-1">
                {editId === tag.id ? (
                  <div className="flex flex-col gap-2 py-1 sm:flex-row sm:items-center">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 rounded border border-input bg-background px-2 text-sm" placeholder="Name" />
                    <input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className="h-7 w-32 rounded border border-input bg-background px-2 font-mono text-sm" placeholder="Slug" />
                    <select value={editCatId} onChange={(e) => setEditCatId(e.target.value)} className="h-7 rounded border border-input bg-background px-2 text-sm">
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => handleEditTag(tag.id)}>OK</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>×</Button>
                    </div>
                    {editError && <span className="text-xs text-destructive">{editError}</span>}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span>{tag.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{tag.slug}</span>
                        <span className="text-xs text-muted-foreground">{tag.postsCount}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startEditTag(tag)} className="text-xs text-muted-foreground hover:text-foreground">Ред.</button>
                        <button onClick={() => { setAliasTagId(aliasTagId === tag.id ? null : tag.id); setAliasError(""); setNewAlias(""); }} className="text-xs text-muted-foreground hover:text-foreground">
                          Aliases{tag.aliases.length > 0 ? ` (${tag.aliases.length})` : ""}
                        </button>
                        {mergeSource === tag.id ? (
                          <TagMergeAutocomplete
                            tags={allTags}
                            excludeId={tag.id}
                            onMerge={(targetId) => handleMerge(tag.id, targetId)}
                            onCancel={() => setMergeSource(null)}
                          />
                        ) : (
                          <button onClick={() => setMergeSource(tag.id)} className="text-xs text-muted-foreground hover:text-foreground">Merge</button>
                        )}
                        <button onClick={() => handleDelete(tag)} className="text-xs text-destructive hover:underline">×</button>
                      </div>
                    </div>
                    {aliasTagId === tag.id && (
                      <div className="mt-1.5 border-t border-border/50 pt-1.5">
                        <div className="flex flex-wrap gap-1">
                          {tag.aliases.map((a) => (
                            <span key={a.id} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">
                              {a.alias}
                              <button onClick={() => handleDeleteAlias(tag.id, a.id)} className="text-destructive hover:text-destructive/80">×</button>
                            </span>
                          ))}
                          {tag.aliases.length === 0 && <span className="text-xs text-muted-foreground">Немає aliases</span>}
                        </div>
                        <div className="mt-1.5">
                          <div className="flex items-center gap-1">
                            <input
                              value={newAlias}
                              onChange={(e) => { setNewAlias(e.target.value); setAliasError(""); }}
                              placeholder="Новий alias..."
                              className="h-6 rounded border border-input bg-background px-2 text-xs"
                              onKeyDown={(e) => { if (e.key === "Enter") handleAddAlias(tag.id); }}
                            />
                            <Button size="xs" variant="ghost" onClick={() => handleAddAlias(tag.id)}>+</Button>
                          </div>
                          {aliasError && <p className="mt-1 text-xs text-destructive">{aliasError}</p>}
                        </div>
                      </div>
                    )}
                  </>
                )}
                </div>
              </div>
            ))}
            {group.tags.length === 0 && <p className="px-3 text-xs text-muted-foreground">Немає тегів</p>}
          </div>
          )}
        </div>
        );
      })}

      {filteredGroups.length === 0 && isFiltering && (
        <p className="py-4 text-center text-sm text-muted-foreground">Нічого не знайдено</p>
      )}
    </div>
  );
}
