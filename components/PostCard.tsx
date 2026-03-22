"use client";

import { useState } from "react";
import Link from "next/link";
import { TagChip } from "./TagChip";
import { PostSources } from "./PostSources";
import { useAdmin } from "./AdminContext";
import { PostInlineEdit } from "./PostInlineEdit";
import { PostTagEditor } from "./PostTagEditor";

interface PostSource {
  id: string;
  tgUrl: string | null;
  originalText: string | null;
  channel: {
    username: string;
    displayName: string | null;
  };
}

interface PostTag {
  tag: {
    name: string;
    slug: string;
    category: {
      name: string;
      slug: string;
    };
  };
}

export interface PostData {
  id: string;
  summary: string | null;
  summaryScore: number | null;
  createdAt: string;
  postSources: PostSource[];
  postTags: PostTag[];
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

function ScoreBadge({ score, label }: { score: number; label: string }) {
  let color: string;
  let bg: string;

  if (label === "quality") {
    if (score >= 0.75) { color = "text-emerald-700"; bg = "bg-emerald-50"; }
    else if (score >= 0.60) { color = "text-amber-700"; bg = "bg-amber-50"; }
    else { color = "text-red-700"; bg = "bg-red-50"; }
  } else {
    if (score >= 0.83) { color = "text-emerald-700"; bg = "bg-emerald-50"; }
    else if (score >= 0.70) { color = "text-amber-700"; bg = "bg-amber-50"; }
    else { color = "text-red-700"; bg = "bg-red-50"; }
  }

  return (
    <span
      className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] leading-tight ${color} ${bg}`}
      title={`${label}: ${score.toFixed(4)}`}
    >
      {score.toFixed(2)}
    </span>
  );
}

export function PostCard({ post, onUpdate, onDelete, selected, onToggleSelect, onSplit }: {
  post: PostData;
  onUpdate?: (updated: PostData) => void;
  onDelete?: (postId: string) => void;
  selected?: boolean;
  onToggleSelect?: () => void;
  onSplit?: (postId: string, sourceId: string) => void;
}) {
  const isAdmin = useAdmin();
  const [editingSummary, setEditingSummary] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPost, setCurrentPost] = useState(post);

  const firstSource = currentPost.postSources[0];

  const handleSummaryUpdate = (newSummary: string) => {
    const updated = { ...currentPost, summary: newSummary };
    setCurrentPost(updated);
    setEditingSummary(false);
    onUpdate?.(updated);
  };

  const handleTagsUpdate = (newTags: PostTag[]) => {
    const updated = { ...currentPost, postTags: newTags };
    setCurrentPost(updated);
    onUpdate?.(updated);
  };

  const handleDelete = async () => {
    if (!confirm("Видалити цей пост?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${currentPost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: true }),
      });
      if (res.ok) onDelete?.(currentPost.id);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className={`border-b border-border py-5 first:pt-0 last:border-b-0 ${selected ? "bg-blue-50/50" : ""}`}>
      {/* Header */}
      <div className="mb-2.5 flex items-center gap-2 text-xs">
        {isAdmin && onToggleSelect && (
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={onToggleSelect}
            className="shrink-0"
          />
        )}
        {firstSource && (
          <a
            href={firstSource.tgUrl ?? "#"}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="font-medium text-foreground/70 transition-colors hover:text-foreground"
          >
            @{firstSource.channel.username}
          </a>
        )}

        <span className="text-muted-foreground/50">·</span>
        <time dateTime={currentPost.createdAt} className="text-muted-foreground">
          {formatRelativeTime(currentPost.createdAt)}
        </time>

        {currentPost.summaryScore != null && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <ScoreBadge score={currentPost.summaryScore} label="quality" />
          </>
        )}

        {/* Admin controls */}
        {isAdmin && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <button
              onClick={() => setEditingSummary(!editingSummary)}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {editingSummary ? "×" : "ред."}
            </button>
            <button
              onClick={() => setEditingTags(!editingTags)}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {editingTags ? "×" : "теги"}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive/60 transition-colors hover:text-destructive"
              title="Видалити пост"
            >
              {deleting ? "..." : "×"}
            </button>
          </>
        )}
      </div>

      {/* Summary */}
      {editingSummary ? (
        <PostInlineEdit
          postId={currentPost.id}
          currentSummary={currentPost.summary ?? ""}
          onSave={handleSummaryUpdate}
          onCancel={() => setEditingSummary(false)}
        />
      ) : (
        currentPost.summary && (
          <p className="text-[0.9375rem] leading-relaxed text-foreground">
            {currentPost.summary}
          </p>
        )
      )}

      {/* Extra sources */}
      <PostSources
        sources={currentPost.postSources}
        postId={currentPost.id}
        onSplit={isAdmin ? onSplit : undefined}
      />

      {/* Tags */}
      {(currentPost.postTags.length > 0 || editingTags) && (
        <div className="mt-3">
          {editingTags ? (
            <PostTagEditor
              postId={currentPost.id}
              currentTags={currentPost.postTags}
              onUpdate={handleTagsUpdate}
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {currentPost.postTags.map((pt) => (
                <TagChip
                  key={pt.tag.slug}
                  name={pt.tag.name}
                  slug={pt.tag.slug}
                  categoryName={pt.tag.category.name}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
