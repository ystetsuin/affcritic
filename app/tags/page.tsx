import Link from "next/link";
import { prisma } from "@/lib/db";
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-border pb-4">
        <h1 className="text-xl font-bold tracking-tight">Tags</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Всі теги по категоріях</p>
      </header>

      {tagGroups.map((group) => (
        <section key={group.category} className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.category}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {group.tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`/tags/${tag.slug}/`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-foreground/20 hover:bg-muted/50"
              >
                <span className="truncate text-foreground">{tag.name}</span>
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">{tag.postsCount}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {tagGroups.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">Поки що немає тегів</p>
      )}
    </div>
  );
}
