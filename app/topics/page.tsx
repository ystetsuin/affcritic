import { prisma } from "@/lib/db";
import { TopicsPage } from "@/components/TopicsPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Topics — AffCritic",
  description: "Browse affiliate news by channel categories and tags",
};

export default async function TopicsIndexPage() {
  const [channelCategories, tagCategories] = await Promise.all([
    prisma.channelCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        name: true,
        slug: true,
        _count: { select: { categoryMap: true } },
      },
    }),
    prisma.tagCategory.findMany({
      where: {
        tags: { some: { status: "active", postTags: { some: {} } } },
      },
      orderBy: { sortOrder: "asc" },
      include: {
        tags: {
          where: { status: "active" },
          select: {
            name: true,
            slug: true,
            _count: { select: { postTags: true } },
          },
        },
      },
    }),
  ]);

  const categories = channelCategories
    .map((c) => ({ name: c.name, slug: c.slug, channelCount: c._count.categoryMap }))
    .filter((c) => c.channelCount > 0);

  const tagGroups = tagCategories
    .map((cat) => ({
      category: cat.name,
      tags: cat.tags
        .map((t) => ({ name: t.name, slug: t.slug, postsCount: t._count.postTags }))
        .filter((t) => t.postsCount > 0)
        .sort((a, b) => b.postsCount - a.postsCount),
    }))
    .filter((g) => g.tags.length > 0);

  return <TopicsPage categories={categories} tagGroups={tagGroups} />;
}
