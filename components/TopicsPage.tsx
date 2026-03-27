"use client";

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
  return (
    <>
      <main style={{ padding: "28px 32px 48px", maxWidth: 960 }}>
        <Breadcrumbs items={[{ label: "AffCritic", href: "/" }, { label: "Тематики" }]} />
        <h1 className="feed-title">Тематики</h1>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>Категорії каналів та теги</p>

        {/* Channel categories */}
        {categories.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <div className="sidebar-cat-name" style={{ marginBottom: 12 }}>Категорії каналів</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/topics/${cat.slug}/`}
                  className="post-card"
                  style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{cat.name}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {cat.channelCount} {plural(cat.channelCount, "канал", "канали", "каналів")}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Tags by category */}
        {tagGroups.map((group) => (
          <section key={group.category} style={{ marginBottom: 32 }}>
            <div className="sidebar-cat-name" style={{ marginBottom: 12 }}>{group.category}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
              {group.tags.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/tags/${tag.slug}/`}
                  className="post-card"
                  style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span style={{ fontSize: 13, color: "var(--text)" }}>{tag.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{tag.postsCount}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {categories.length === 0 && tagGroups.length === 0 && (
          <p style={{ textAlign: "center", padding: "64px 0", color: "var(--text-muted)" }}>
            Поки що немає тематик
          </p>
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
