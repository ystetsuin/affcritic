export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ChannelsPage } from "@/components/ChannelsPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Channels — AffCritic",
  description: "All monitored Telegram channels with post statistics",
};

export default async function ChannelsIndexPage() {
  try {
    return await renderChannelsPage();
  } catch {
    return <ChannelsPage channels={[]} categories={[]} />;
  }
}

async function renderChannelsPage() {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [channels, channelCategories, rawPostDates, feedSources, latestSubs, oldSubs, topTagsRaw] = await Promise.all([
    prisma.channel.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        description: true,
        isActive: true,
        categoryMap: {
          include: { category: { select: { id: true, name: true, slug: true } } },
        },
        _count: { select: { rawPosts: true } },
      },
    }),
    prisma.channelCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, _count: { select: { categoryMap: true } } },
    }),
    // Raw posts last 30 days for sparklines
    prisma.rawPost.findMany({
      where: { postedAt: { gte: thirtyDaysAgo, not: null } },
      select: { channelId: true, postedAt: true },
    }),
    // Feed posts per channel
    prisma.postSource.findMany({
      where: { post: { isDeleted: false, summary: { not: null } } },
      select: { channelId: true, postId: true },
    }),
    // Latest subscriber counts
    prisma.channelStatsHistory.findMany({
      orderBy: { scrapedAt: "desc" },
      distinct: ["channelId"],
      select: { channelId: true, subscribers: true },
    }),
    // Subscriber counts ~7 days ago
    prisma.channelStatsHistory.findMany({
      where: { scrapedAt: { lte: sevenDaysAgo } },
      orderBy: { scrapedAt: "desc" },
      distinct: ["channelId"],
      select: { channelId: true, subscribers: true },
    }),
    // Top tags per channel
    prisma.postTag.findMany({
      where: {
        tag: { status: "active" },
        post: { isDeleted: false, summary: { not: null } },
      },
      select: {
        post: { select: { postSources: { select: { channelId: true }, take: 1 } } },
        tag: { select: { name: true, slug: true } },
      },
    }),
  ]);

  // Build subscriber maps
  const subsMap = new Map(latestSubs.map((s) => [s.channelId, s.subscribers]));
  const oldSubsMap = new Map(oldSubs.map((s) => [s.channelId, s.subscribers]));

  // Build feed post count map (deduplicated by postId)
  const feedByChannel = new Map<string, Set<string>>();
  for (const s of feedSources) {
    if (!feedByChannel.has(s.channelId)) feedByChannel.set(s.channelId, new Set());
    feedByChannel.get(s.channelId)!.add(s.postId);
  }

  // Build sparkline map: 30 daily counts per channel
  const sparklineMap = new Map<string, number[]>();
  const dayBuckets = new Map<string, Map<string, number>>();
  for (const rp of rawPostDates) {
    const dateKey = rp.postedAt!.toISOString().slice(0, 10);
    if (!dayBuckets.has(rp.channelId)) dayBuckets.set(rp.channelId, new Map());
    const chMap = dayBuckets.get(rp.channelId)!;
    chMap.set(dateKey, (chMap.get(dateKey) ?? 0) + 1);
  }
  // Generate 30-day array for each channel
  for (const [chId, chMap] of dayBuckets) {
    const arr: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      arr.push(chMap.get(key) ?? 0);
    }
    sparklineMap.set(chId, arr);
  }

  // Build top tags per channel (top 3)
  const tagsByChannel = new Map<string, Map<string, { name: string; slug: string; count: number }>>();
  for (const pt of topTagsRaw) {
    const chId = pt.post.postSources[0]?.channelId;
    if (!chId) continue;
    if (!tagsByChannel.has(chId)) tagsByChannel.set(chId, new Map());
    const chTags = tagsByChannel.get(chId)!;
    const key = pt.tag.slug;
    if (chTags.has(key)) {
      chTags.get(key)!.count++;
    } else {
      chTags.set(key, { name: pt.tag.name, slug: pt.tag.slug, count: 1 });
    }
  }

  const channelData = channels.map((ch) => {
    const totalRaw = ch._count.rawPosts;
    const feedPosts = feedByChannel.get(ch.id)?.size ?? 0;
    const subs = subsMap.get(ch.id) ?? null;
    const oldSub = oldSubsMap.get(ch.id) ?? null;
    const chTags = tagsByChannel.get(ch.id);
    const topTags = chTags
      ? Array.from(chTags.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map(({ name, slug }) => ({ name, slug }))
      : [];

    return {
      username: ch.username,
      displayName: ch.displayName,
      avatarUrl: ch.avatarUrl,
      description: ch.description,
      isActive: ch.isActive,
      categories: ch.categoryMap.map((m) => m.category),
      subscribers: subs,
      subscribersDelta7d: subs != null && oldSub != null ? subs - oldSub : null,
      postsInFeed: feedPosts,
      dedupRatio: totalRaw > 0 ? parseFloat((feedPosts / totalRaw).toFixed(4)) : 0,
      topTags,
      sparkline: sparklineMap.get(ch.id) ?? Array(30).fill(0),
    };
  });

  // Sort by subscribers DESC (null last)
  channelData.sort((a, b) => (b.subscribers ?? -1) - (a.subscribers ?? -1));

  const categories = channelCategories
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, channelCount: c._count.categoryMap }))
    .filter((c) => c.channelCount > 0);

  return <ChannelsPage channels={channelData} categories={categories} />;
}
