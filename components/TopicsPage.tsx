"use client";
// neon-emerald hub
import Link from "next/link";
import { Breadcrumbs } from "./Breadcrumbs";
import { Footer } from "./Footer";

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
  const isEmpty = categories.length === 0 && tagGroups.length === 0;

  return (
    <>
      <main className="topics-page">
        <Breadcrumbs items={[{ label: "AffCritic", href: "/" }, { label: "Тематики" }]} />
        <h1 className="feed-title">Тематики</h1>
        <p className="topics-lede">Категорії каналів та теги</p>

        {categories.length > 0 && (
          <section className="topics-section">
            <h2 className="topics-section-h">Категорії каналів</h2>
            <div className="topic-tile-grid">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/topics/${cat.slug}/`}
                  className="topic-tile"
                >
                  <span className="topic-tile-name">{cat.name}</span>
                  <span className="topic-tile-count">
                    {cat.channelCount} {plural(cat.channelCount, "канал", "канали", "каналів")}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {tagGroups.map((group) => (
          <section key={group.category} className="topics-section">
            <h2 className="topics-section-h">{group.category}</h2>
            <div className="tag-tile-grid">
              {group.tags.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/tags/${tag.slug}/`}
                  className="tag-tile"
                >
                  <span className="tag-tile-name">{tag.name}</span>
                  <span className="tag-tile-count">{tag.postsCount}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {isEmpty && (
          <p className="topics-empty">no topics yet</p>
        )}
      </main>
      <Footer />
    </>
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
