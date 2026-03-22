"use client";

import { useState, useCallback } from "react";
import { PostCard } from "./PostCard";
import type { PostData } from "./PostCard";
import { Button } from "@/components/ui/button";
import { useAdmin } from "./AdminContext";

interface FeedClientProps {
  initialPosts: PostData[];
  total: number;
  pageSize: number;
  folder?: string;
  channel?: string;
  tag?: string;
}

export function FeedClient({
  initialPosts,
  total,
  pageSize,
  folder,
  channel,
  tag,
}: FeedClientProps) {
  const isAdmin = useAdmin();
  const [posts, setPosts] = useState<PostData[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Merge state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);

  // Split state
  const [splitting, setSplitting] = useState<string | null>(null); // sourceId being split

  const hasMore = posts.length < total;

  const loadMore = useCallback(async () => {
    setLoading(true);
    const nextPage = page + 1;
    const params = new URLSearchParams({ page: String(nextPage), limit: String(pageSize) });
    if (folder) params.set("folder", folder);
    if (channel) params.set("channel", channel);
    if (tag) params.set("tag", tag);

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
  }, [page, pageSize, folder, channel, tag]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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
        // Reload feed to reflect changes
        const params = new URLSearchParams({ page: "1", limit: String(pageSize * page) });
        if (folder) params.set("folder", folder);
        if (channel) params.set("channel", channel);
        if (tag) params.set("tag", tag);
        const refreshRes = await fetch(`/api/posts?${params}`);
        const data = await refreshRes.json();
        setPosts(data.posts);
        setSelected(new Set());
      }
    } catch (err) {
      console.error("Merge failed:", err);
    } finally {
      setMerging(false);
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
        // Reload feed
        const params = new URLSearchParams({ page: "1", limit: String(pageSize * page) });
        if (folder) params.set("folder", folder);
        if (channel) params.set("channel", channel);
        if (tag) params.set("tag", tag);
        const refreshRes = await fetch(`/api/posts?${params}`);
        const data = await refreshRes.json();
        setPosts(data.posts);
      }
    } catch (err) {
      console.error("Split failed:", err);
    } finally {
      setSplitting(null);
    }
  };

  if (posts.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Поки що немає новин
      </div>
    );
  }

  return (
    <div>
      {/* Merge toolbar */}
      {isAdmin && selected.size >= 2 && (
        <div className="sticky top-0 z-10 mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
          <span className="text-sm font-medium">Вибрано: {selected.size}</span>
          <Button size="sm" onClick={handleMerge} disabled={merging}>
            {merging ? (
              <span className="flex items-center gap-1.5">
                <Spinner /> Об&apos;єднання...
              </span>
            ) : (
              "Об'єднати"
            )}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Скасувати
          </Button>
        </div>
      )}

      {/* Split loading overlay */}
      {splitting && (
        <div className="sticky top-0 z-10 mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
          <Spinner /> Відокремлення джерела...
        </div>
      )}

      <div className="divide-y divide-border">
        {posts.map((post) => (
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
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? "Завантаження..." : "Показати ще"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
