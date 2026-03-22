import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") ?? "week";

  const now = new Date();
  let since: Date;
  switch (period) {
    case "day": since = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case "week": since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case "month": since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    default: since = new Date("2020-01-01"); break;
  }

  // GPT logs for cost only
  const gptLogs = await prisma.pipelineLog.findMany({
    where: { type: "gpt", createdAt: { gte: since } },
    select: { createdAt: true, payload: true },
    orderBy: { createdAt: "asc" },
  });

  // Real counts from tables
  const [posts, rawPosts] = await Promise.all([
    prisma.post.findMany({
      where: { summary: { not: null }, isDeleted: false, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.rawPost.findMany({
      where: { processed: true, postedAt: { gte: since } },
      select: { postedAt: true },
    }),
  ]);

  // Aggregate by day
  const dayMap = new Map<string, { cost_usd: number; summaries_created: number; posts_processed: number }>();

  for (const log of gptLogs) {
    const day = log.createdAt.toISOString().slice(0, 10);
    const entry = dayMap.get(day) ?? { cost_usd: 0, summaries_created: 0, posts_processed: 0 };
    const payload = log.payload as Record<string, unknown>;
    entry.cost_usd += Number(payload.cost_usd ?? 0);
    dayMap.set(day, entry);
  }

  for (const post of posts) {
    const day = post.createdAt.toISOString().slice(0, 10);
    const entry = dayMap.get(day) ?? { cost_usd: 0, summaries_created: 0, posts_processed: 0 };
    entry.summaries_created += 1;
    dayMap.set(day, entry);
  }

  for (const rp of rawPosts) {
    if (!rp.postedAt) continue;
    const day = rp.postedAt.toISOString().slice(0, 10);
    const entry = dayMap.get(day) ?? { cost_usd: 0, summaries_created: 0, posts_processed: 0 };
    entry.posts_processed += 1;
    dayMap.set(day, entry);
  }

  // Sort by date and build array
  const data = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      cost_usd: parseFloat(vals.cost_usd.toFixed(6)),
      posts_processed: vals.posts_processed,
      summaries_created: vals.summaries_created,
    }));

  const totals = {
    cost_usd: parseFloat(data.reduce((s, d) => s + d.cost_usd, 0).toFixed(6)),
    posts_processed: data.reduce((s, d) => s + d.posts_processed, 0),
    summaries_created: data.reduce((s, d) => s + d.summaries_created, 0),
  };

  return NextResponse.json({ data, totals, period });
}
