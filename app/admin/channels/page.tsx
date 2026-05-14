"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  rawPostsTotal: number;
  rawPosts24h: number;
  rawPosts7d: number;
  feedPosts: number;
  uniquePercent: number | null;
  lastPostAt: string | null;
}

interface Folder {
  id: string;
  name: string;
  slug: string;
  channelsCount: number;
}

type SortKey = "username" | "feedPosts" | "uniquePercent" | "lastPostAt" | "rawPosts24h";
type SortDir = "asc" | "desc";
type ActiveFilter = "all" | "active" | "inactive";

function relativeTime(date: string | null): string {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}хв`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}год`;
  const days = Math.floor(hours / 24);
  return `${days}д`;
}

function daysSince(date: string | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

export default function AdminChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("feedPosts");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Filter
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newCategoryIds, setNewCategoryIds] = useState<Set<string>>(new Set());
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Category popover
  const [catPopoverId, setCatPopoverId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [chRes, fRes] = await Promise.all([
        fetch("/api/channels?admin=1"),
        fetch("/api/folders"),
      ]);
      if (chRes.ok) setChannels(await chRes.json());
      if (fRes.ok) setFolders(await fRes.json());
    } catch (err) {
      console.error("[admin/channels] fetchData error:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset selection on filter/search change
  useEffect(() => { setSelectedIds(new Set()); }, [search, activeFilter]);

  // CRUD handlers
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

  const handleSaveDisplayName = async (ch: Channel) => {
    const value = editValue.trim() || null;
    if (value === ch.displayName) { setEditingId(null); return; }
    await fetch(`/api/channels/${ch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: value }),
    });
    setEditingId(null);
    fetchData();
  };

  // Sort handler
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "username" ? "asc" : "desc");
    }
  };

  const sortIndicator = (key: SortKey) => sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredIds = useMemo(() => {
    let list = channels;
    if (activeFilter === "active") list = list.filter((ch) => ch.isActive);
    if (activeFilter === "inactive") list = list.filter((ch) => !ch.isActive);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((ch) => ch.username.toLowerCase().includes(q) || ch.displayName?.toLowerCase().includes(q));
    }
    return new Set(list.map((ch) => ch.id));
  }, [channels, search, activeFilter]);

  const toggleSelectAll = () => {
    const allSelected = [...filteredIds].every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIds));
    }
  };

  // Filter + sort
  const filtered = useMemo(() => {
    let list = channels.filter((ch) => filteredIds.has(ch.id));
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "username": cmp = a.username.localeCompare(b.username); break;
        case "feedPosts": cmp = a.feedPosts - b.feedPosts; break;
        case "uniquePercent": cmp = (a.uniquePercent ?? -1) - (b.uniquePercent ?? -1); break;
        case "lastPostAt": cmp = new Date(a.lastPostAt ?? 0).getTime() - new Date(b.lastPostAt ?? 0).getTime(); break;
        case "rawPosts24h": cmp = a.rawPosts24h - b.rawPosts24h; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [channels, filteredIds, sortKey, sortDir]);

  // Summary stats
  const summary = useMemo(() => {
    const active = channels.filter((ch) => ch.isActive);
    const inactive = channels.filter((ch) => !ch.isActive);
    const postsToday = channels.reduce((s, ch) => s + ch.rawPosts24h, 0);
    const activeWithUnique = active.filter((ch) => ch.uniquePercent !== null);
    const avgUnique = activeWithUnique.length > 0
      ? Math.round(activeWithUnique.reduce((s, ch) => s + (ch.uniquePercent ?? 0), 0) / activeWithUnique.length)
      : 0;
    const dead = channels.filter((ch) => ch.isActive && daysSince(ch.lastPostAt) !== null && (daysSince(ch.lastPostAt) ?? 0) > 7).length;
    return { active: active.length, inactive: inactive.length, postsToday, avgUnique, dead };
  }, [channels]);

  // Bulk handlers
  const bulkAction = async (url: string, body: object) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { setSelectedIds(new Set()); fetchData(); }
  };

  const allFilteredSelected = filteredIds.size > 0 && [...filteredIds].every((id) => selectedIds.has(id));

  return (
    <div className={`mx-auto max-w-6xl px-4 py-6 ${selectedIds.size > 0 ? "pb-20" : ""}`}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Канали</h1>
        <Button onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Скасувати" : "Додати канал"}
        </Button>
      </div>

      {/* Add form */}
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

      {/* Summary header */}
      {!loading && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <MetricTile label="Активних" value={String(summary.active)} sub={`${summary.inactive} inactive`} />
          <MetricTile label="Posts 24h" value={String(summary.postsToday)} />
          <MetricTile label="Avg Unique" value={`${summary.avgUnique}%`} />
          <MetricTile label="Dead (>7д)" value={String(summary.dead)} color={summary.dead > 0 ? "text-amber-400 light:text-amber-600" : undefined} />
          <MetricTile label="Всього" value={String(channels.length)} />
        </div>
      )}

      {/* Search + Filter */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Пошук по username..."
          className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring sm:w-64"
        />
        <div className="flex gap-1">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                activeFilter === f
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f === "all" ? "Всі" : f === "active" ? "Активні" : "Неактивні"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Завантаження...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="size-4 accent-current"
                  />
                </th>
                <th className="pb-2 pr-3 font-medium">
                  <button onClick={() => handleSort("username")} className="hover:text-foreground">
                    Канал{sortIndicator("username")}
                  </button>
                </th>
                <th className="pb-2 pr-3 font-medium">Категорії</th>
                <th className="hidden pb-2 pr-3 text-right font-medium sm:table-cell">
                  <button onClick={() => handleSort("rawPosts24h")} className="hover:text-foreground">
                    24h{sortIndicator("rawPosts24h")}
                  </button>
                </th>
                <th className="hidden pb-2 pr-3 text-right font-medium sm:table-cell">7d</th>
                <th className="pb-2 pr-3 text-right font-medium">
                  <button onClick={() => handleSort("feedPosts")} className="hover:text-foreground">
                    Feed{sortIndicator("feedPosts")}
                  </button>
                </th>
                <th className="pb-2 pr-3 text-right font-medium">
                  <button onClick={() => handleSort("uniquePercent")} className="hover:text-foreground">
                    Uniq{sortIndicator("uniquePercent")}
                  </button>
                </th>
                <th className="pb-2 pr-3 text-right font-medium">
                  <button onClick={() => handleSort("lastPostAt")} className="hover:text-foreground">
                    Last{sortIndicator("lastPostAt")}
                  </button>
                </th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 font-medium">Дії</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ch) => {
                const days = daysSince(ch.lastPostAt);
                const isDead30 = days !== null && days > 30;
                const isDead7 = days !== null && days > 7 && days <= 30;
                const uniqueColor = ch.uniquePercent === null ? "text-muted-foreground"
                  : ch.uniquePercent >= 60 ? "text-emerald-400 light:text-emerald-600"
                  : ch.uniquePercent < 20 ? "text-red-400 light:text-red-600"
                  : "";
                const isSelected = selectedIds.has(ch.id);

                return (
                  <tr key={ch.id} className={`border-b border-border/50 ${!ch.isActive ? "opacity-50" : ""} ${isSelected ? "bg-accent/50" : ""}`}>
                    {/* Checkbox */}
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(ch.id)}
                        className="size-4 accent-current"
                      />
                    </td>
                    {/* Channel + display name */}
                    <td className="py-2 pr-3">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-medium">@{ch.username}</span>
                        {editingId === ch.id ? (
                          <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveDisplayName(ch);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            onBlur={() => setEditingId(null)}
                            className="h-5 w-32 rounded border border-input bg-background px-1 text-xs"
                          />
                        ) : (
                          <button
                            onClick={() => { setEditingId(ch.id); setEditValue(ch.displayName ?? ""); }}
                            className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            {ch.displayName || "—"}
                            <svg className="hidden size-3 group-hover:inline" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8.5 1.5l2 2M1 11l.7-2.8L9.2 .7l2 2L3.8 10.2 1 11z"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                    {/* Categories */}
                    <td className="relative py-2 pr-3">
                      <CategoryCell
                        channel={ch}
                        folders={folders}
                        isOpen={catPopoverId === ch.id}
                        onToggle={() => setCatPopoverId(catPopoverId === ch.id ? null : ch.id)}
                        onClose={() => setCatPopoverId(null)}
                        onAdd={handleAddCategory}
                        onRemove={handleRemoveCategory}
                      />
                    </td>
                    {/* Raw 24h */}
                    <td className="hidden py-2 pr-3 text-right sm:table-cell">{ch.rawPosts24h}</td>
                    {/* Raw 7d */}
                    <td className="hidden py-2 pr-3 text-right sm:table-cell">{ch.rawPosts7d}</td>
                    {/* Feed */}
                    <td className="py-2 pr-3 text-right">{ch.feedPosts}</td>
                    {/* Unique */}
                    <td className={`py-2 pr-3 text-right ${uniqueColor}`}>
                      {ch.uniquePercent !== null ? `${ch.uniquePercent}%` : "—"}
                    </td>
                    {/* Last post */}
                    <td className="py-2 pr-3 text-right">
                      <span className={isDead30 ? "text-red-400 light:text-red-600" : isDead7 ? "text-amber-400 light:text-amber-600" : ""}>
                        {relativeTime(ch.lastPostAt)}
                      </span>
                      {isDead30 && <span className="ml-1 text-[10px] text-red-400 light:text-red-600">dead</span>}
                      {isDead7 && <span className="ml-1 text-[10px] text-amber-400 light:text-amber-600">slow</span>}
                    </td>
                    {/* Status */}
                    <td className="py-2 pr-3">
                      <button
                        onClick={() => handleToggleActive(ch)}
                        className={`rounded-sm px-2 py-0.5 text-[10px] font-medium ${ch.isActive ? "bg-emerald-500/20 text-emerald-400 light:bg-emerald-50 light:text-emerald-700" : "bg-red-500/20 text-red-400 light:bg-red-50 light:text-red-700"}`}
                      >
                        {ch.isActive ? "Active" : "Off"}
                      </button>
                    </td>
                    {/* Actions */}
                    <td className="py-2">
                      <button onClick={() => handleDelete(ch)} className="text-xs text-destructive hover:underline">×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">{search ? "Нічого не знайдено" : "Немає каналів"}</p>
          )}
        </div>
      )}

      {/* Bulk toolbar */}
      {selectedIds.size > 0 && (
        <BulkToolbar
          count={selectedIds.size}
          folders={folders}
          onActivate={() => bulkAction("/api/channels/bulk-status", { channelIds: Array.from(selectedIds), isActive: true })}
          onDeactivate={() => bulkAction("/api/channels/bulk-status", { channelIds: Array.from(selectedIds), isActive: false })}
          onAddCategory={(categoryId) => bulkAction("/api/channels/bulk-add-category", { channelIds: Array.from(selectedIds), categoryId })}
          onDelete={async () => {
            if (!confirm(`Видалити ${selectedIds.size} каналів? Raw posts каналів залишаться в базі.`)) return;
            await bulkAction("/api/channels/bulk-delete", { channelIds: Array.from(selectedIds) });
          }}
          onCancel={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}

// ─── Category Cell with Popover ─────────────────────────

function CategoryCell({ channel, folders, isOpen, onToggle, onClose, onAdd, onRemove }: {
  channel: Channel;
  folders: Folder[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onAdd: (channelId: string, folderId: string) => void;
  onRemove: (channelId: string, folderId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  const assignedIds = new Set(channel.categories.map((c) => c.id));

  return (
    <div ref={ref}>
      <button
        onClick={onToggle}
        className="flex flex-wrap items-center gap-1 text-left hover:underline decoration-dashed underline-offset-2"
      >
        {channel.categories.length > 0
          ? channel.categories.map((cat) => (
              <span key={cat.id} className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {cat.name}
              </span>
            ))
          : <span className="text-[10px] text-muted-foreground">+</span>
        }
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 w-48 max-h-60 overflow-y-auto rounded border border-border bg-background p-1 shadow-lg">
          {folders.map((f) => {
            const checked = assignedIds.has(f.id);
            return (
              <label key={f.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (checked) onRemove(channel.id, f.id);
                    else onAdd(channel.id, f.id);
                  }}
                  className="size-3.5 accent-current"
                />
                {f.name}
              </label>
            );
          })}
          {folders.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">Немає категорій</div>}
        </div>
      )}
    </div>
  );
}

// ─── Bulk Toolbar ───────────────────────────────────────

function BulkToolbar({ count, folders, onActivate, onDeactivate, onAddCategory, onDelete, onCancel }: {
  count: number;
  folders: Folder[];
  onActivate: () => void;
  onDeactivate: () => void;
  onAddCategory: (categoryId: string) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [catId, setCatId] = useState("");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <span className="text-sm font-medium">{count} каналів вибрано</span>

        <Button size="sm" onClick={onActivate}>Активувати</Button>
        <Button size="sm" variant="outline" onClick={onDeactivate}>Деактивувати</Button>

        <span className="text-border">|</span>

        <select
          value={catId}
          onChange={(e) => setCatId(e.target.value)}
          className="h-7 rounded border border-input bg-background px-2 text-sm"
        >
          <option value="" disabled>Категорія...</option>
          {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <Button size="sm" variant="outline" disabled={!catId} onClick={() => { onAddCategory(catId); setCatId(""); }}>
          Додати
        </Button>

        <span className="text-border">|</span>

        <Button size="sm" variant="destructive" onClick={onDelete}>Видалити</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Скасувати</Button>
      </div>
    </div>
  );
}

// ─── Metric Tile ────────────────────────────────────────

function MetricTile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${color ?? ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
