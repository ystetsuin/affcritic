"use client";

import Link from "next/link";

interface TagStat {
  name: string;
  slug: string;
  count: number;
}

export function TopTagsBar({ tags }: { tags: TagStat[] }) {
  if (tags.length === 0) return null;

  const maxCount = Math.max(...tags.map((t) => t.count));

  return (
    <div className="top-tags-bar">
      {tags.map((tag) => (
        <Link
          key={tag.slug}
          href={`/tags/${tag.slug}/`}
          className="top-tag-row"
        >
          <span className="top-tag-name">{tag.name}</span>
          <div className="top-tag-bar-track">
            <div
              className="top-tag-bar-fill"
              style={{ width: `${(tag.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="top-tag-count">{tag.count}</span>
        </Link>
      ))}
    </div>
  );
}
