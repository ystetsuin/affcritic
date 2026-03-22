import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export async function GET() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch all channels with categories and raw_posts counts per period
  const channels = await prisma.channel.findMany({
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
  });

  // Batch count per channel per period using groupBy
  const [todayCounts, weekCounts, monthCounts] = await Promise.all([
    prisma.rawPost.groupBy({
      by: ["channelId"],
      where: { postedAt: { gte: todayStart } },
      _count: true,
    }),
    prisma.rawPost.groupBy({
      by: ["channelId"],
      where: { postedAt: { gte: weekAgo } },
      _count: true,
    }),
    prisma.rawPost.groupBy({
      by: ["channelId"],
      where: { postedAt: { gte: monthAgo } },
      _count: true,
    }),
  ]);

  // Build lookup maps
  const toMap = (rows: { channelId: string; _count: number }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.channelId, r._count);
    return m;
  };
  const todayMap = toMap(todayCounts);
  const weekMap = toMap(weekCounts);
  const monthMap = toMap(monthCounts);

  // Totals
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
      stats: {
        today,
        week,
        month,
        allTime,
      },
      share: {
        today: totals.today > 0 ? parseFloat((today / totals.today).toFixed(4)) : 0,
        week: totals.week > 0 ? parseFloat((week / totals.week).toFixed(4)) : 0,
        month: totals.month > 0 ? parseFloat((month / totals.month).toFixed(4)) : 0,
        allTime: totals.allTime > 0 ? parseFloat((allTime / totals.allTime).toFixed(4)) : 0,
      },
    };
  });

  // Categories with channelCount > 0
  const categoryMap = new Map<string, { id: string; name: string; slug: string; channelCount: number }>();
  for (const ch of channels) {
    for (const m of ch.categoryMap) {
      const existing = categoryMap.get(m.category.id);
      if (existing) {
        existing.channelCount++;
      } else {
        categoryMap.set(m.category.id, {
          id: m.category.id,
          name: m.category.name,
          slug: m.category.slug,
          channelCount: 1,
        });
      }
    }
  }

  const categories = Array.from(categoryMap.values()).filter((c) => c.channelCount > 0);

  return NextResponse.json({
    channels: channelData,
    categories,
    totals,
  });
}
