"use client";

import Link from "next/link";

interface CategoryTile {
  name: string;
  slug: string;
  channelCount: number;
}

interface TagTile {
  name: string;
  slug: string;
  postsCount: number;
}

interface TagGroupData {
  category: string;
  tags: TagTile[];
}

interface TopicsPageProps {
  categories: CategoryTile[];
  tagGroups: TagGroupData[];
}

export function TopicsPage({ categories, tagGroups }: TopicsPageProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-border pb-4">
        <h1 className="text-xl font-bold tracking-tight">Topics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Тематики каналів та теги</p>
      </header>

      {/* Channel categories */}
      {categories.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Категорії каналів
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/topics/${cat.slug}/`}
                className="group rounded-lg border border-border p-5 transition-colors hover:border-foreground/20 hover:bg-muted/50"
              >
                <span className="text-base font-semibold text-foreground group-hover:text-foreground/80">
                  {cat.name}
                </span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {cat.channelCount} {plural(cat.channelCount, "канал", "канали", "каналів")}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tags by category */}
      {tagGroups.map((group) => (
        <section key={group.category} className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.category}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {group.tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`/tag/${tag.slug}/`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-foreground/20 hover:bg-muted/50"
              >
                <span className="truncate text-foreground">{tag.name}</span>
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">{tag.postsCount}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {categories.length === 0 && tagGroups.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">Поки що немає тематик</p>
      )}
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}
