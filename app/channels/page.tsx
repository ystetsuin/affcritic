import { prisma } from "@/lib/db";
import { ChannelsPage } from "@/components/ChannelsPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Channels — AffCritic",
  description: "All monitored Telegram channels with post statistics",
};

export default async function ChannelsIndexPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [channels, todayCounts, weekCounts, monthCounts, channelCategories] = await Promise.all([
    prisma.channel.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        displayName: true,
        isActive: true,
        categoryMap: {
          include: { category: { select: { id: true, name: true, slug: true } } },
        },
        _count: { select: { rawPosts: true } },
      },
    }),
    prisma.rawPost.groupBy({ by: ["channelId"], where: { postedAt: { gte: todayStart } }, _count: true }),
    prisma.rawPost.groupBy({ by: ["channelId"], where: { postedAt: { gte: weekAgo } }, _count: true }),
    prisma.rawPost.groupBy({ by: ["channelId"], where: { postedAt: { gte: monthAgo } }, _count: true }),
    prisma.channelCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, _count: { select: { categoryMap: true } } },
    }),
  ]);

  const toMap = (rows: { channelId: string; _count: number }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.channelId, r._count);
    return m;
  };
  const todayMap = toMap(todayCounts);
  const weekMap = toMap(weekCounts);
  const monthMap = toMap(monthCounts);

  const totals = {
    today: todayCounts.reduce((s, r) => s + r._count, 0),
    week: weekCounts.reduce((s, r) => s + r._count, 0),
    month: monthCounts.reduce((s, r) => s + r._count, 0),
    allTime: channels.reduce((s, ch) => s + ch._count.rawPosts, 0),
  };

  const channelData = channels.map((ch) => {
    const today = todayMap.get(ch.id) ?? 0;
    const week = weekMap.get(ch.id) ?? 0;
    const month = monthMap.get(ch.id) ?? 0;
    const allTime = ch._count.rawPosts;
    return {
      id: ch.id,
      username: ch.username,
      displayName: ch.displayName,
      isActive: ch.isActive,
      categories: ch.categoryMap.map((m) => m.category),
      stats: { today, week, month, allTime },
      share: {
        today: totals.today > 0 ? parseFloat((today / totals.today).toFixed(4)) : 0,
        week: totals.week > 0 ? parseFloat((week / totals.week).toFixed(4)) : 0,
        month: totals.month > 0 ? parseFloat((month / totals.month).toFixed(4)) : 0,
        allTime: totals.allTime > 0 ? parseFloat((allTime / totals.allTime).toFixed(4)) : 0,
      },
    };
  });

  const categories = channelCategories
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, channelCount: c._count.categoryMap }))
    .filter((c) => c.channelCount > 0);

  return <ChannelsPage channels={channelData} categories={categories} totals={totals} />;
}
