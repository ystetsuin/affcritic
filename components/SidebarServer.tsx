import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { Sidebar, SidebarDrawer } from "./Sidebar";

const getSidebarGroups = unstable_cache(
  async () => {
    const categories = await prisma.tagCategory.findMany({
      where: {
        tags: { some: { status: "active", postTags: { some: { post: { isDeleted: false, summary: { not: null } } } } } },
      },
      orderBy: { sortOrder: "asc" },
      include: {
        tags: {
          where: { status: "active" },
          select: {
            name: true,
            slug: true,
            aliases: { select: { alias: true } },
            _count: {
              select: {
                postTags: { where: { post: { isDeleted: false, summary: { not: null } } } },
              },
            },
          },
        },
      },
    });

    return categories
      .map((cat) => ({
        category: cat.name,
        categorySlug: cat.slug,
        tags: cat.tags
          .map((t) => ({ name: t.name, slug: t.slug, aliases: t.aliases.map((a) => a.alias), postsCount: t._count.postTags }))
          .filter((t) => t.postsCount > 0),
      }))
      .filter((g) => g.tags.length > 0);
  },
  ["sidebar-groups"],
  { revalidate: 300 }
);

async function safeSidebarGroups() {
  try {
    return await getSidebarGroups();
  } catch {
    return [];
  }
}

const getChannelCategories = unstable_cache(
  async () => {
    const channelCategories = await prisma.channelCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { categoryMap: true } },
      },
    });

    return channelCategories
      .map((c) => ({ id: c.id, name: c.name, slug: c.slug, channelCount: c._count.categoryMap }))
      .filter((c) => c.channelCount > 0);
  },
  ["channel-categories-sidebar"],
  { revalidate: 300 }
);

async function safeChannelCategories() {
  try {
    return await getChannelCategories();
  } catch {
    return [];
  }
}

export async function SidebarServer() {
  const groups = await safeSidebarGroups();
  return { desktop: <Sidebar groups={groups} />, mobile: <SidebarDrawer groups={groups} /> };
}

export async function ChannelCategoriesSidebarServer() {
  const cats = await safeChannelCategories();

  return {
    desktop: <Sidebar groups={[]} mode="channels" channelCategories={cats} activeCategorySlug={null} />,
    mobile: <SidebarDrawer groups={[]} mode="channels" channelCategories={cats} activeCategorySlug={null} />,
  };
}

export async function DesktopSidebar() {
  const { desktop } = await SidebarServer();
  return (
    <aside className="d-sidebar hidden lg:block">
      {desktop}
    </aside>
  );
}

export async function MobileSidebarButton() {
  const { mobile } = await SidebarServer();
  return mobile;
}
