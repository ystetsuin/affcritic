import Link from "next/link";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tags — AffCritic",
  description: "Browse affiliate news by tags",
};

export default async function TagsIndexPage() {
  const tagCategories = await prisma.tagCategory.findMany({
    where: {
      tags: { some: { status: "active", postTags: { some: {} } } },
    },
    orderBy: { sortOrder: "asc" },
    include: {
      tags: {
        where: { status: "active", postTags: { some: {} } },
        select: {
          name: true,
          slug: true,
          _count: { select: { postTags: true } },
        },
      },
    },
  });

  const tagGroups = tagCategories
    .map((cat) => ({
      category: cat.name,
      tags: cat.tags
        .map((t) => ({ name: t.name, slug: t.slug, postsCount: t._count.postTags }))
        .sort((a, b) => b.postsCount - a.postsCount),
    }))
    .filter((g) => g.tags.length > 0);

  return (
    <>
      <main style={{ padding: "28px 32px 48px", maxWidth: 960 }}>
        <Breadcrumbs items={[{ label: "AffCritic", href: "/" }, { label: "Теги" }]} />
        <h1 className="feed-title">Теги</h1>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>Всі теги по категоріях</p>

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

        {tagGroups.length === 0 && (
          <p style={{ textAlign: "center", padding: "64px 0", color: "var(--text-muted)" }}>
            Поки що немає тегів
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
