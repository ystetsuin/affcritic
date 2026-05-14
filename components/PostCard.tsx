"use client";

import { useState } from "react";
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
  publishedAt: string | null;
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

  if (diffMin < 1) return "щойно";
  if (diffMin < 60) return `${diffMin} хв тому`;
  if (diffHr < 24) return `${diffHr} год тому`;
  if (diffDay < 7) return `${diffDay} дн тому`;

  return new Date(dateStr).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "short",
  });
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
  const [deleting, setDeleting] = useState(false);
  const [currentPost, setCurrentPost] = useState(post);

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
    <article className={`post-card${selected ? " selected" : ""}`}>
      {/* 1. Header */}
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isAdmin && onToggleSelect && (
            <input
              type="checkbox"
              className="merge-cb"
              checked={selected ?? false}
              onChange={onToggleSelect}
            />
          )}
          <span className="card-time" suppressHydrationWarning>{formatRelativeTime(currentPost.publishedAt ?? currentPost.createdAt)}</span>
          {isAdmin && <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-muted)" }}>{currentPost.id.slice(0, 8)}</span>}
        </div>

        {isAdmin && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              className="admin-btn"
              onClick={() => setEditingSummary(!editingSummary)}
              title={editingSummary ? "Скасувати" : "Редагувати summary"}
            >
              {editingSummary ? (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" /></svg>
              )}
            </button>
            <button
              className="admin-btn danger"
              onClick={handleDelete}
              disabled={deleting}
              title="Видалити пост"
              style={deleting ? { opacity: 0.5 } : undefined}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h10l-1 9H4L3 3z" />
                <path d="M1 3h14" />
                <path d="M6 3V2h4v1" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 2. Summary */}
      {editingSummary ? (
        <PostInlineEdit
          postId={currentPost.id}
          currentSummary={currentPost.summary ?? ""}
          onSave={handleSummaryUpdate}
          onCancel={() => setEditingSummary(false)}
        />
      ) : (
        currentPost.summary && (
          <p className="card-summary">{currentPost.summary}</p>
        )
      )}

      {/* 3. Tags + Sources */}
      <PostSources
        sources={currentPost.postSources}
        postId={currentPost.id}
        score={currentPost.summaryScore}
        onSplit={isAdmin ? onSplit : undefined}
      >
        {({ toggle, panel }) => (
          <>
            <div className="card-bottom">
              {isAdmin ? (
                <div className="card-tags">
                  <PostTagEditor
                    postId={currentPost.id}
                    currentTags={currentPost.postTags}
                    onUpdate={handleTagsUpdate}
                  />
                </div>
              ) : (
                currentPost.postTags.length > 0 && (
                  <div className="card-tags">
                    {currentPost.postTags.map((pt, i) => (
                      <TagChip
                        key={`${pt.tag.slug}-${i}`}
                        name={pt.tag.name}
                        slug={pt.tag.slug}
                      />
                    ))}
                  </div>
                )
              )}
              {toggle}
            </div>
            {panel}
          </>
        )}
      </PostSources>
    </article>
  );
}
