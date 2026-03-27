"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { PostCard } from "./PostCard";
import type { PostData } from "./PostCard";
import { useAdmin } from "./AdminContext";
import { useTagFilter } from "./TagFilterContext";

interface FeedClientProps {
  initialPosts: PostData[];
  total: number;
  pageSize: number;
  folder?: string;
  channel?: string;
  tag?: string;
  period?: string;
}

export function FeedClient({
  initialPosts,
  total,
  pageSize,
  folder,
  channel,
  tag,
  period,
}: FeedClientProps) {
  const isAdmin = useAdmin();
  const { selectedSlugs } = useTagFilter();
  const [posts, setPosts] = useState<PostData[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Reset when server re-renders with new period
  const prevPeriod = useRef(period);
  useEffect(() => {
    if (prevPeriod.current !== period) {
      setPosts(initialPosts);
      setPage(1);
      prevPeriod.current = period;
    }
  }, [period, initialPosts]);

  // Merge state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);

  // Split state
  const [splitting, setSplitting] = useState<string | null>(null);

  const hasMore = posts.length < total;

  // Client-side tag filtering
  const filteredPosts = useMemo(() => {
    if (selectedSlugs.length === 0) return posts;
    return posts.filter((post) =>
      post.postTags?.some((pt: { tag: { slug: string } }) =>
        selectedSlugs.includes(pt.tag.slug)
      )
    );
  }, [posts, selectedSlugs]);

  const buildParams = useCallback((extra?: Record<string, string>) => {
    const params = new URLSearchParams(extra);
    if (folder) params.set("folder", folder);
    if (channel) params.set("channel", channel);
    if (tag) params.set("tag", tag);
    if (period && period !== "all") params.set("period", period);
    return params;
  }, [folder, channel, tag, period]);

  const loadMore = useCallback(async () => {
    setLoading(true);
    const nextPage = page + 1;
    const params = buildParams({ page: String(nextPage), limit: String(pageSize) });

    try {
      const res = await fetch(`/api/posts?${params}`);
      const data = await res.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setPage(nextPage);
    } catch (err) {
      console.error("Failed to load more posts:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, buildParams]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Bulk delete state
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const refreshFeed = useCallback(async () => {
    const params = buildParams({ page: "1", limit: String(pageSize * page) });
    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();
    setPosts(data.posts);
  }, [buildParams, pageSize, page]);

  const handleMerge = async () => {
    if (selected.size < 2) return;
    setMerging(true);
    try {
      const res = await fetch("/api/posts/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: Array.from(selected) }),
      });
      if (res.ok) {
        await refreshFeed();
        setSelected(new Set());
      }
    } catch (err) {
      console.error("Merge failed:", err);
    } finally {
      setMerging(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Видалити ${selected.size} постів?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/posts/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isDeleted: true }),
          })
        )
      );
      setPosts((prev) => prev.filter((p) => !selected.has(p.id)));
      setSelected(new Set());
    } catch (err) {
      console.error("Bulk delete failed:", err);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSplit = async (postId: string, sourceId: string) => {
    setSplitting(sourceId);
    try {
      const res = await fetch(`/api/posts/${postId}/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      if (res.ok) {
        await refreshFeed();
      }
    } catch (err) {
      console.error("Split failed:", err);
    } finally {
      setSplitting(null);
    }
  };

  if (posts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text-muted)" }}>
        Поки що немає новин
      </div>
    );
  }

  return (
    <div>
      {/* Split loading */}
      {splitting && (
        <div className="admin-toolbar" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Spinner /> <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Відокремлення джерела...</span>
        </div>
      )}

      {/* No results for active filter */}
      {selectedSlugs.length > 0 && filteredPosts.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: 13 }}>
          Немає постів з обраними тегами
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            selected={selected.has(post.id)}
            onToggleSelect={() => toggleSelect(post.id)}
            onSplit={handleSplit}
            onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
          />
        ))}
      </div>

      {hasMore && (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <button className="load-more-btn" onClick={loadMore} disabled={loading}>
            {loading ? "Завантаження..." : "Показати ще"}
          </button>
        </div>
      )}

      {/* Bulk toolbar — sticky bottom */}
      {isAdmin && selected.size >= 1 && (
        <div className="bulk-toolbar">
          <span className="bulk-count">Обрано: {selected.size}</span>
          <button className="bulk-btn merge" onClick={handleMerge} disabled={merging || selected.size < 2}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v12M2 8h12" />
            </svg>
            {merging ? "..." : "Об'єднати"}
          </button>
          <button className="bulk-btn delete" onClick={handleBulkDelete} disabled={bulkDeleting}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h10l-1 9H4L3 3z" />
              <path d="M1 3h14" />
              <path d="M6 3V2h4v1" />
            </svg>
            {bulkDeleting ? "..." : "Видалити"}
          </button>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none">
      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
