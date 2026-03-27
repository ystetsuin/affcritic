"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface PostSource {
  id: string;
  originalText: string | null;
  tgUrl: string | null;
  channel: { username: string; displayName: string | null };
}

interface PostTag {
  tag: { name: string; slug: string; category: { name: string } };
}

interface Post {
  id: string;
  summary: string | null;
  summaryScore: number | null;
  createdAt: string;
  isDeleted: boolean;
  isManuallyEdited: boolean;
  isManuallyGrouped: boolean;
  postSources: PostSource[];
  postTags: PostTag[];
}

type ScoreFilter = "all" | "ok" | "suspicious" | "bad";

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");

  // Selection for merge
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Expanded post
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSummary, setEditSummary] = useState("");

  // Async operation loading
  const [opLoading, setOpLoading] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();
    setPosts(data.posts);
    setTotal(data.pagination.total);
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Filters
  const filtered = posts.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.summary?.toLowerCase().includes(q)) return false;
    }
    if (scoreFilter !== "all" && p.summaryScore != null) {
      if (scoreFilter === "ok" && p.summaryScore < 0.75) return false;
      if (scoreFilter === "suspicious" && (p.summaryScore < 0.60 || p.summaryScore >= 0.75)) return false;
      if (scoreFilter === "bad" && p.summaryScore >= 0.60) return false;
    }
    return true;
  });

  // Actions
  const handleDelete = async (post: Post) => {
    if (!confirm("Видалити пост?")) return;
    await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDeleted: true }),
    });
    fetchPosts();
  };

  const handleSaveEdit = async (id: string) => {
    await fetch(`/api/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: editSummary }),
    });
    setEditingId(null);
    fetchPosts();
  };

  const handleMerge = async () => {
    if (selected.size < 2) return;
    setOpLoading("merge");
    await fetch("/api/posts/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postIds: Array.from(selected) }),
    });
    setSelected(new Set());
    setOpLoading(null);
    fetchPosts();
  };

  const handleSplit = async (postId: string, sourceId: string) => {
    setOpLoading(sourceId);
    await fetch(`/api/posts/${postId}/split`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId }),
    });
    setOpLoading(null);
    fetchPosts();
  };

  const handleExclude = async (postId: string, sourceId: string) => {
    if (!confirm("Видалити це джерело?")) return;
    setOpLoading(sourceId);
    await fetch(`/api/posts/${postId}/exclude`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId }),
    });
    setOpLoading(null);
    fetchPosts();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const scoreColor = (s: number | null) => {
    if (s == null) return "text-muted-foreground";
    if (s >= 0.75) return "text-emerald-400 bg-emerald-500/20 light:text-emerald-700 light:bg-emerald-50";
    if (s >= 0.60) return "text-amber-400 bg-amber-500/20 light:text-amber-700 light:bg-amber-50";
    return "text-red-400 bg-red-500/20 light:text-red-700 light:bg-red-50";
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">Пости</h1>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук по summary..."
            className="h-8 w-48 rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value as ScoreFilter)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="all">Score: всі</option>
            <option value="ok">🟢 ≥ 0.75</option>
            <option value="suspicious">🟡 0.60-0.74</option>
            <option value="bad">🔴 &lt; 0.60</option>
          </select>
        </div>

        {selected.size >= 2 && (
          <Button onClick={handleMerge} disabled={opLoading === "merge"}>
            {opLoading === "merge" ? "Об'єднання..." : `Об'єднати (${selected.size})`}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Завантаження...</p>
      ) : (
        <div className="space-y-1">
          {filtered.map((post) => (
            <div
              key={post.id}
              className={`rounded-lg border ${post.isDeleted ? "border-red-500/30 bg-red-500/10 light:border-red-200 light:bg-red-50/30 opacity-60" : "border-border"}`}
            >
              {/* Post row */}
              <div className="flex items-start gap-3 px-4 py-3">
                {/* Checkbox for merge */}
                {!post.isDeleted && (
                  <input
                    type="checkbox"
                    checked={selected.has(post.id)}
                    onChange={() => toggleSelect(post.id)}
                    className="mt-1 shrink-0"
                  />
                )}

                <div className="min-w-0 flex-1">
                  {/* Summary */}
                  {editingId === post.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={editSummary}
                        onChange={(e) => setEditSummary(e.target.value)}
                        rows={3}
                        className="w-full rounded border border-input bg-background p-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => handleSaveEdit(post.id)}>Зберегти</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Скасувати</Button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className="cursor-pointer text-sm leading-relaxed"
                      onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                    >
                      {post.summary
                        ? (post.summary.length > 150 ? post.summary.slice(0, 150) + "…" : post.summary)
                        : <span className="italic text-muted-foreground">Немає summary</span>
                      }
                    </p>
                  )}

                  {/* Meta */}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{post.postSources.length} дж.</span>
                    <span>{post.postTags.length} тегів</span>
                    {post.summaryScore != null && (
                      <span className={`rounded-sm px-1.5 py-0.5 font-mono ${scoreColor(post.summaryScore)}`}>
                        {post.summaryScore.toFixed(2)}
                      </span>
                    )}
                    <span>{new Date(post.createdAt).toLocaleDateString("uk-UA")}</span>
                    {post.isManuallyEdited && <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-400 light:bg-blue-50 light:text-blue-700">edited</span>}
                    {post.isManuallyGrouped && <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-purple-400 light:bg-purple-50 light:text-purple-700">grouped</span>}
                    {post.isDeleted && <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-400 light:bg-red-50 light:text-red-700">deleted</span>}
                  </div>
                </div>

                {/* Actions */}
                {!post.isDeleted && editingId !== post.id && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => { setEditingId(post.id); setEditSummary(post.summary || ""); }}
                    >
                      Ред.
                    </Button>
                    <Button size="xs" variant="destructive" onClick={() => handleDelete(post)}>
                      ×
                    </Button>
                  </div>
                )}
              </div>

              {/* Expanded: sources */}
              {expandedId === post.id && (
                <div className="border-t border-border px-4 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Джерела</p>
                  <div className="space-y-2">
                    {post.postSources.map((src) => (
                      <div key={src.id} className="rounded border border-border/50 p-2.5">
                        <div className="flex items-center justify-between">
                          <a
                            href={src.tgUrl ?? "#"}
                            target="_blank"
                            rel="nofollow noopener noreferrer"
                            className="text-sm font-medium text-foreground/70 hover:text-foreground"
                          >
                            @{src.channel.username}
                          </a>
                          <div className="flex gap-1">
                            {post.postSources.length > 1 && (
                              <>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  disabled={opLoading === src.id}
                                  onClick={() => handleSplit(post.id, src.id)}
                                >
                                  {opLoading === src.id ? "..." : "Відокремити"}
                                </Button>
                                <Button
                                  size="xs"
                                  variant="destructive"
                                  disabled={opLoading === src.id}
                                  onClick={() => handleExclude(post.id, src.id)}
                                >
                                  {opLoading === src.id ? "..." : "Видалити"}
                                </Button>
                              </>
                            )}
                            {post.postSources.length === 1 && (
                              <Button
                                size="xs"
                                variant="destructive"
                                disabled={opLoading === src.id}
                                onClick={() => handleExclude(post.id, src.id)}
                              >
                                {opLoading === src.id ? "..." : "Видалити"}
                              </Button>
                            )}
                          </div>
                        </div>
                        {src.originalText && (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {src.originalText.length > 300
                              ? src.originalText.slice(0, 300) + "…"
                              : src.originalText}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              {search || scoreFilter !== "all" ? "Нічого не знайдено" : "Немає постів"}
            </p>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ←
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            →
          </Button>
        </div>
      )}
    </div>
  );
}
