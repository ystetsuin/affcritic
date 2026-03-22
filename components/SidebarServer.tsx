import { prisma } from "@/lib/db";
import { Sidebar, SidebarDrawer } from "./Sidebar";

export async function SidebarServer() {
  const categories = await prisma.tagCategory.findMany({
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
          aliases: { select: { alias: true } },
          _count: { select: { postTags: true } },
        },
      },
    },
  });

  const groups = categories
    .map((cat) => ({
      category: cat.name,
      categorySlug: cat.slug,
      tags: cat.tags
        .map((t) => ({ name: t.name, slug: t.slug, aliases: t.aliases.map((a) => a.alias), postsCount: t._count.postTags }))
        .filter((t) => t.postsCount > 0),
    }))
    .filter((g) => g.tags.length > 0);

  return { desktop: <Sidebar groups={groups} />, mobile: <SidebarDrawer groups={groups} /> };
}

export async function ChannelCategoriesSidebarServer() {
  const channelCategories = await prisma.channelCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { categoryMap: true } },
    },
  });

  const cats = channelCategories
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, channelCount: c._count.categoryMap }))
    .filter((c) => c.channelCount > 0);

  return {
    desktop: <Sidebar groups={[]} mode="channels" channelCategories={cats} activeCategorySlug={null} />,
    mobile: <SidebarDrawer groups={[]} mode="channels" channelCategories={cats} activeCategorySlug={null} />,
  };
}

export async function DesktopSidebar() {
  const { desktop } = await SidebarServer();
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      {desktop}
    </aside>
  );
}

export async function MobileSidebarButton() {
  const { mobile } = await SidebarServer();
  return mobile;
}
