import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const channel = await prisma.channel.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const channelId = channel.id;

  const [totalRawPosts, feedPosts, topTagsRaw, rawPostDates, viewsData] =
    await Promise.all([
      prisma.rawPost.count({ where: { channelId } }),

      prisma.postSource.findMany({
        where: {
          channelId,
          post: { isDeleted: false, summary: { not: null } },
        },
        select: {
          postId: true,
          post: { select: { summaryScore: true } },
        },
      }),

      prisma.postTag.groupBy({
        by: ["tagId"],
        where: {
          post: {
            isDeleted: false,
            summary: { not: null },
            postSources: { some: { channelId } },
          },
          tag: { status: "active" },
        },
        _count: true,
        orderBy: { _count: { tagId: "desc" } },
        take: 10,
      }),

      prisma.rawPost.findMany({
        where: { channelId, postedAt: { not: null } },
        select: { postedAt: true },
      }),

      // Views data for reach stats
      prisma.rawPost.findMany({
        where: { channelId, views: { not: null } },
        select: { views: true, postedAt: true },
      }),
    ]);

  // --- Metrics ---
  const uniquePostIds = new Set(feedPosts.map((s) => s.postId));
  const totalInFeed = uniquePostIds.size;
  const dedupRatio = totalRawPosts > 0 ? totalInFeed / totalRawPosts : 0;

  const scoreByPost = new Map<string, number>();
  for (const s of feedPosts) {
    if (s.post.summaryScore != null && !scoreByPost.has(s.postId)) {
      scoreByPost.set(s.postId, s.post.summaryScore);
    }
  }
  const avgSummaryScore =
    scoreByPost.size > 0
      ? Array.from(scoreByPost.values()).reduce((a, b) => a + b, 0) /
        scoreByPost.size
      : null;

  // --- Top tags ---
  const tagIds = topTagsRaw.map((t) => t.tagId);
  const tags =
    tagIds.length > 0
      ? await prisma.tag.findMany({
          where: { id: { in: tagIds } },
          select: { id: true, name: true, slug: true },
        })
      : [];
  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const topTags = topTagsRaw
    .map((t) => {
      const tag = tagMap.get(t.tagId);
      return tag ? { name: tag.name, slug: tag.slug, count: t._count } : null;
    })
    .filter(Boolean);

  // --- Heatmap (day × hour) ---
  const heatmapMap = new Map<string, number>();
  const fiftyTwoWeeksAgo = Date.now() - 52 * 7 * 24 * 60 * 60 * 1000;
  const activityMap = new Map<string, number>();

  for (const rp of rawPostDates) {
    const d = rp.postedAt!;
    const day = d.getUTCDay();
    const hour = d.getUTCHours();
    const hKey = `${day}-${hour}`;
    heatmapMap.set(hKey, (heatmapMap.get(hKey) ?? 0) + 1);

    if (d.getTime() >= fiftyTwoWeeksAgo) {
      const wk = isoWeek(d);
      activityMap.set(wk, (activityMap.get(wk) ?? 0) + 1);
    }
  }

  const heatmap = Array.from(heatmapMap.entries()).map(([key, count]) => {
    const [day, hour] = key.split("-").map(Number);
    return { day, hour, count };
  });

  const activityByWeek = Array.from(activityMap.entries())
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week));

  // --- Subscribers ---
  const subHistory = await prisma.channelStatsHistory.findMany({
    where: { channelId },
    orderBy: { scrapedAt: "desc" },
    take: 1000, // enough for 90 days of data
    select: { subscribers: true, scrapedAt: true },
  });

  let subscribers = null;
  if (subHistory.length > 0) {
    const current = subHistory[0].subscribers;
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(todayStart.getTime() - 90 * 24 * 60 * 60 * 1000);

    const findClosest = (target: Date) => {
      let best: typeof subHistory[0] | null = null;
      let bestDiff = Infinity;
      for (const s of subHistory) {
        const diff = Math.abs(s.scrapedAt.getTime() - target.getTime());
        if (diff < bestDiff) { bestDiff = diff; best = s; }
      }
      return best;
    };

    const atToday = findClosest(todayStart);
    const atWeek = findClosest(weekAgo);
    const atMonth = findClosest(monthAgo);

    // Daily history: last entry per day, last 90 days
    const dailyMap = new Map<string, number>();
    for (const s of subHistory) {
      if (s.scrapedAt.getTime() < ninetyDaysAgo.getTime()) continue;
      const dateKey = s.scrapedAt.toISOString().slice(0, 10);
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, s.subscribers);
      }
    }
    const history = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Compute daily deltas from sorted history
    const deltas: { date: string; delta: number }[] = [];
    for (let i = 1; i < history.length; i++) {
      deltas.push({
        date: history[i].date,
        delta: history[i].count - history[i - 1].count,
      });
    }
    const avgDeltaPerDay =
      deltas.length > 0
        ? parseFloat((deltas.reduce((s, d) => s + d.delta, 0) / deltas.length).toFixed(2))
        : 0;

    subscribers = {
      current,
      deltaToday: atToday ? current - atToday.subscribers : 0,
      deltaWeek: atWeek ? current - atWeek.subscribers : 0,
      deltaMonth: atMonth ? current - atMonth.subscribers : 0,
      history,
      deltas,
      avgDeltaPerDay,
    };
  }

  // --- Reach ---
  let reach = null;
  if (viewsData.length > 0) {
    const allViews = viewsData.map((r) => r.views!);
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 86400000);
    const d30 = new Date(now.getTime() - 30 * 86400000);

    const computePeriod = (items: number[]) => {
      if (items.length === 0) return { median: 0, mean: 0, posts: 0 };
      const sorted = [...items].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
      const mean = Math.round(items.reduce((s, v) => s + v, 0) / items.length);
      return { median, mean, posts: items.length };
    };

    const views7d = viewsData.filter((r) => r.postedAt && r.postedAt >= d7).map((r) => r.views!);
    const views30d = viewsData.filter((r) => r.postedAt && r.postedAt >= d30).map((r) => r.views!);

    const allStats = computePeriod(allViews);
    const currentSubs = subscribers?.current ?? null;
    const er = currentSubs ? parseFloat(((allStats.median / currentSubs) * 100).toFixed(1)) : null;

    // Histogram buckets
    const buckets = [
      { label: "0-500", min: 0, max: 500 },
      { label: "500-1K", min: 500, max: 1000 },
      { label: "1K-3K", min: 1000, max: 3000 },
      { label: "3K-5K", min: 3000, max: 5000 },
      { label: "5K-10K", min: 5000, max: 10000 },
      { label: "10K+", min: 10000, max: Infinity },
    ];
    const histogram = buckets.map((b) => ({
      bucket: b.label,
      count: allViews.filter((v) => v >= b.min && v < b.max).length,
    }));

    reach = {
      median: allStats.median,
      mean: allStats.mean,
      er,
      periods: {
        "7d": computePeriod(views7d),
        "30d": computePeriod(views30d),
        all: allStats,
      },
      histogram,
      postsWithViews: viewsData.length,
      totalPosts: totalRawPosts,
    };
  }

  return NextResponse.json({
    totalRawPosts,
    totalInFeed,
    dedupRatio: parseFloat(dedupRatio.toFixed(4)),
    avgSummaryScore:
      avgSummaryScore != null
        ? parseFloat(avgSummaryScore.toFixed(4))
        : null,
    topTags,
    heatmap,
    activityByWeek,
    subscribers,
    reach,
  });
}

function isoWeek(d: Date): string {
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
