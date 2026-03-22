"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Folder {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  channelsCount: number;
}

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya", є: "ye", і: "i", ї: "yi", ґ: "g",
};

function translitSlug(text: string): string {
  return text.toLowerCase().split("").map((ch) => TRANSLIT[ch] ?? ch).join("")
    .replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

export default function AdminTopicsPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [createError, setCreateError] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editError, setEditError] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchFolders = useCallback(async () => {
    const res = await fetch("/api/folders");
    setFolders(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim() }),
    });
    if (!res.ok) { setCreateError((await res.json()).error); return; }
    setNewName(""); setNewSlug(""); setShowCreate(false);
    fetchFolders();
  };

  const startEdit = (f: Folder) => {
    setEditId(f.id); setEditName(f.name); setEditSlug(f.slug); setEditError("");
  };

  const handleEdit = async (id: string) => {
    setEditError("");
    const res = await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), slug: editSlug.trim() }),
    });
    if (!res.ok) { setEditError((await res.json()).error); return; }
    setEditId(null);
    fetchFolders();
  };

  const handleDelete = async (f: Folder) => {
    if (!confirm(`Видалити тематику "${f.name}"? Прив'язки каналів будуть видалені.`)) return;
    await fetch(`/api/folders/${f.id}`, { method: "DELETE" });
    fetchFolders();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = folders.findIndex((f) => f.id === active.id);
    const newIndex = folders.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(folders, oldIndex, newIndex);
    setFolders(reordered);

    await fetch("/api/folders/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((f) => f.id) }),
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Тематики каналів</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Скасувати" : "Створити"}
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <input
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setNewSlug(translitSlug(e.target.value)); }}
                placeholder="Назва"
                required
                className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">slug: {newSlug || "—"}</div>
            </div>
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="Slug (авто)"
              required
              className="h-8 rounded-md border border-input bg-background px-3 font-mono text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button type="submit">Створити</Button>
          </div>
          {createError && <p className="mt-2 text-sm text-destructive">{createError}</p>}
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Завантаження...</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={folders.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {folders.map((f) => (
                <SortableRow
                  key={f.id}
                  folder={f}
                  isEditing={editId === f.id}
                  editName={editName}
                  editSlug={editSlug}
                  editError={editError}
                  onEditName={setEditName}
                  onEditSlug={setEditSlug}
                  onStartEdit={() => startEdit(f)}
                  onSaveEdit={() => handleEdit(f.id)}
                  onCancelEdit={() => setEditId(null)}
                  onDelete={() => handleDelete(f)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {!loading && folders.length === 0 && <p className="py-8 text-center text-muted-foreground">Немає тематик</p>}
    </div>
  );
}

function SortableRow({ folder, isEditing, editName, editSlug, editError, onEditName, onEditSlug, onStartEdit, onSaveEdit, onCancelEdit, onDelete }: {
  folder: Folder;
  isEditing: boolean;
  editName: string;
  editSlug: string;
  editError: string;
  onEditName: (v: string) => void;
  onEditSlug: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-border px-4 py-3">
      {isEditing ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input value={editName} onChange={(e) => { onEditName(e.target.value); onEditSlug(translitSlug(e.target.value)); }} className="h-7 rounded border border-input bg-background px-2 text-sm" />
          <input value={editSlug} onChange={(e) => onEditSlug(e.target.value)} className="h-7 w-40 rounded border border-input bg-background px-2 font-mono text-sm" />
          <div className="flex gap-1">
            <Button size="sm" onClick={onSaveEdit}>Зберегти</Button>
            <Button size="sm" variant="ghost" onClick={onCancelEdit}>×</Button>
          </div>
          {editError && <span className="text-xs text-destructive">{editError}</span>}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground"
              title="Перетягнути"
            >
              ⠿
            </button>
            <span className="font-medium">{folder.name}</span>
            <span className="font-mono text-xs text-muted-foreground">/{folder.slug}/</span>
            <span className="text-xs text-muted-foreground">{folder.channelsCount} каналів</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onStartEdit} className="text-xs text-muted-foreground hover:text-foreground">Ред.</button>
            <button onClick={onDelete} className="text-xs text-destructive hover:underline">Видалити</button>
          </div>
        </div>
      )}
    </div>
  );
}
