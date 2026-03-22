import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export async function GET() {
  const [
    channelsTotal,
    channelsActive,
    categoriesCount,
    postsTotal,
    postsDeleted,
    rawPostsProcessed,
    rawPostsUnprocessed,
    tagsActive,
    tagsPending,
    tagCategoriesCount,
    settings,
  ] = await Promise.all([
    prisma.channel.count(),
    prisma.channel.count({ where: { isActive: true } }),
    prisma.channelCategory.count(),
    prisma.post.count(),
    prisma.post.count({ where: { isDeleted: true } }),
    prisma.rawPost.count({ where: { processed: true } }),
    prisma.rawPost.count({ where: { processed: false } }),
    prisma.tag.count({ where: { status: "active" } }),
    prisma.tag.count({ where: { status: "pending" } }),
    prisma.tagCategory.count(),
    prisma.adminSetting.findMany(),
  ]);

  const settingsMap: Record<string, string> = {};
  for (const s of settings) settingsMap[s.key] = s.value;

  return NextResponse.json({
    channels: { total: channelsTotal, active: channelsActive },
    channelCategories: categoriesCount,
    posts: { total: postsTotal, deleted: postsDeleted },
    rawPosts: { processed: rawPostsProcessed, unprocessed: rawPostsUnprocessed },
    tags: { active: tagsActive, pending: tagsPending },
    tagCategories: tagCategoriesCount,
    lastScrapeAt: settingsMap.last_scrape_at ?? null,
    cronInterval: settingsMap.cron_interval ?? "8",
  });
}
