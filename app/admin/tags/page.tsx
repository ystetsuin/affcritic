"use client";

import { useState, useEffect, useCallback } from "react";
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

  const fetchData = useCallback(async () => {
    const [catRes, tagsRes] = await Promise.all([
      fetch("/api/tag-categories"),
      fetch("/api/tags"),
    ]);
    setCategories(await catRes.json());
    setTags(await tagsRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pendingTags = tags.filter((t) => t.status === "pending");
  const activeTags = tags.filter((t) => t.status === "active");
  const groupedActive = categories.map((cat) => ({
    ...cat,
    tags: activeTags.filter((t) => t.category.id === cat.id).sort((a, b) => b.postsCount - a.postsCount),
  }));

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-6 text-sm text-muted-foreground">Завантаження...</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-8">
      <h1 className="text-xl font-bold">Теги</h1>

      {/* Pending section */}
      {pendingTags.length > 0 && (
        <PendingSection tags={pendingTags} categories={categories} allTags={activeTags} onRefresh={fetchData} />
      )}

      {/* Tag categories CRUD */}
      <CategoriesSection categories={categories} onRefresh={fetchData} />

      {/* Active tags by category */}
      <ActiveTagsSection groups={groupedActive} categories={categories} allTags={activeTags} onRefresh={fetchData} />
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
    <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase text-amber-700">
        Pending ({tags.length})
      </h2>
      <div className="space-y-2">
        {tags.map((tag) => (
          <div key={tag.id} className="flex flex-col gap-2 rounded border border-amber-200 bg-background p-3 sm:flex-row sm:items-center">
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
                <select
                  onChange={(e) => { if (e.target.value) handleMerge(tag.id, e.target.value); }}
                  defaultValue=""
                  className="h-6 rounded border border-input bg-background px-1 text-xs"
                >
                  <option value="" disabled>Merge into...</option>
                  {allTags.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category.name})</option>
                  ))}
                </select>
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

function ActiveTagsSection({ groups, categories, allTags, onRefresh }: {
  groups: (TagCategory & { tags: Tag[] })[];
  categories: TagCategory[];
  allTags: Tag[];
  onRefresh: () => void;
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

      {groups.map((group) => (
        <div key={group.id} className="mb-4">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.name}</h3>
          <div className="space-y-0.5">
            {group.tags.map((tag) => (
              <div key={tag.id} className="rounded px-3 py-1 text-sm hover:bg-muted/50">
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
                          <select
                            onChange={(e) => { if (e.target.value) handleMerge(tag.id, e.target.value); }}
                            defaultValue=""
                            className="h-6 rounded border border-input bg-background px-1 text-xs"
                          >
                            <option value="" disabled>Merge into...</option>
                            {allTags.filter((t) => t.id !== tag.id).map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
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
            ))}
            {group.tags.length === 0 && <p className="px-3 text-xs text-muted-foreground">Немає тегів</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
