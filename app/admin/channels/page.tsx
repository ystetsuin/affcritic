"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Channel {
  id: string;
  username: string;
  displayName: string | null;
  isActive: boolean;
  createdAt: string;
  categories: Category[];
}

interface Folder {
  id: string;
  name: string;
  slug: string;
  channelsCount: number;
}

export default function AdminChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newCategoryIds, setNewCategoryIds] = useState<Set<string>>(new Set());
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(async () => {
    const [chRes, fRes] = await Promise.all([
      fetch("/api/channels"),
      fetch("/api/folders"),
    ]);
    setChannels(await chRes.json());
    setFolders(await fRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAdding(true);
    const username = newUsername.trim().replace(/^@/, "");
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        displayName: newDisplayName.trim() || undefined,
        categoryIds: newCategoryIds.size > 0 ? Array.from(newCategoryIds) : undefined,
      }),
    });
    if (!res.ok) {
      setAddError((await res.json()).error || "Failed");
      setAdding(false);
      return;
    }
    setNewUsername(""); setNewDisplayName(""); setNewCategoryIds(new Set()); setShowAdd(false); setAdding(false);
    fetchData();
  };

  const toggleNewCategory = (id: string) => {
    setNewCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleActive = async (ch: Channel) => {
    await fetch(`/api/channels/${ch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !ch.isActive }),
    });
    fetchData();
  };

  const handleDelete = async (ch: Channel) => {
    if (!confirm(`Видалити канал @${ch.username}?`)) return;
    await fetch(`/api/channels/${ch.id}`, { method: "DELETE" });
    fetchData();
  };

  const handleAddCategory = async (channelId: string, folderId: string) => {
    await fetch(`/api/folders/${folderId}/channels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    });
    fetchData();
  };

  const handleRemoveCategory = async (channelId: string, folderId: string) => {
    await fetch(`/api/folders/${folderId}/channels?channelId=${channelId}`, { method: "DELETE" });
    fetchData();
  };

  const filtered = channels.filter(
    (ch) =>
      !search ||
      ch.username.toLowerCase().includes(search.toLowerCase()) ||
      ch.displayName?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Канали</h1>
        <Button onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Скасувати" : "Додати канал"}
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-6 rounded-lg border border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.replace(/^@/, ""))}
              placeholder="@username"
              required
              className="h-8 rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Display name (опціонально)"
              className="h-8 rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button type="submit" disabled={adding}>{adding ? "..." : "Додати"}</Button>
          </div>
          {folders.length > 0 && (
            <div className="mt-3">
              <span className="text-xs text-muted-foreground">Категорії:</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {folders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleNewCategory(f.id)}
                    className={`rounded-sm px-2 py-0.5 text-xs font-medium transition-colors ${
                      newCategoryIds.has(f.id)
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {addError && <p className="mt-2 text-sm text-destructive">{addError}</p>}
        </form>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Пошук по username..."
        className="mb-4 h-8 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring sm:w-64"
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Завантаження...</p>
      ) : (
        <div className="space-y-1">
          {filtered.map((ch) => {
            const assignedIds = new Set(ch.categories.map((c) => c.id));
            const available = folders.filter((f) => !assignedIds.has(f.id));

            return (
              <div key={ch.id} className="rounded-lg border border-border px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-3">
                    <span className="font-medium">@{ch.username}</span>
                    {ch.displayName && <span className="text-sm text-muted-foreground">{ch.displayName}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(ch)}
                      className={`rounded-sm px-2 py-0.5 text-xs font-medium ${ch.isActive ? "bg-emerald-500/20 text-emerald-400 light:bg-emerald-50 light:text-emerald-700" : "bg-red-500/20 text-red-400 light:bg-red-50 light:text-red-700"}`}
                    >
                      {ch.isActive ? "Active" : "Inactive"}
                    </button>
                    <button onClick={() => handleDelete(ch)} className="text-xs text-destructive hover:underline">Видалити</button>
                  </div>
                </div>

                {/* Categories */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {ch.categories.map((cat) => (
                    <span key={cat.id} className="inline-flex items-center gap-1 rounded-sm bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {cat.name}
                      <button onClick={() => handleRemoveCategory(ch.id, cat.id)} className="text-destructive/60 hover:text-destructive">×</button>
                    </span>
                  ))}
                  {available.length > 0 && (
                    <select
                      onChange={(e) => { if (e.target.value) { handleAddCategory(ch.id, e.target.value); e.target.value = ""; } }}
                      defaultValue=""
                      className="h-6 rounded border border-input bg-background px-1 text-xs"
                    >
                      <option value="" disabled>+ Категорія</option>
                      {available.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">{search ? "Нічого не знайдено" : "Немає каналів"}</p>
          )}
        </div>
      )}
    </div>
  );
}
