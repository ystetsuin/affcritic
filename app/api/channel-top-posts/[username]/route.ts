import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID_METRICS = ["views", "forwards", "replies"] as const;
type Metric = (typeof VALID_METRICS)[number];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const { searchParams } = req.nextUrl;

  const metric = (searchParams.get("metric") ?? "views") as Metric;
  if (!VALID_METRICS.includes(metric)) {
    return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
  }

  const period = searchParams.get("period") ?? "all";

  const channel = await prisma.channel.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const channelId = channel.id;

  // Date filter
  let postedAfter: Date | undefined;
  if (period === "7d") postedAfter = new Date(Date.now() - 7 * 86400000);
  else if (period === "30d") postedAfter = new Date(Date.now() - 30 * 86400000);

  // Fetch all posts with the metric, for median calculation + top 10
  const whereClause: Record<string, unknown> = {
    channelId,
    [metric]: { not: null },
  };
  if (postedAfter) whereClause.postedAt = { gte: postedAfter };

  const rawPosts = await prisma.rawPost.findMany({
    where: whereClause,
    orderBy: { [metric]: "desc" },
    select: {
      messageId: true,
      text: true,
      views: true,
      forwards: true,
      replies: true,
      postedAt: true,
      postId: true,
    },
  });

  if (rawPosts.length === 0) {
    return NextResponse.json({
      metric,
      period,
      medianViews: 0,
      posts: [],
    });
  }

  // Compute median of the metric
  const metricValues = rawPosts.map((r) => (r[metric] as number) ?? 0).sort((a, b) => a - b);
  const mid = Math.floor(metricValues.length / 2);
  const medianValue = metricValues.length % 2
    ? metricValues[mid]
    : Math.round((metricValues[mid - 1] + metricValues[mid]) / 2);

  // Top 10
  const top10 = rawPosts.slice(0, 10);

  // Fetch summaries for grouped posts
  const postIds = top10.map((r) => r.postId).filter(Boolean) as string[];
  const summaries = postIds.length > 0
    ? await prisma.post.findMany({
        where: { id: { in: postIds }, isDeleted: false, summary: { not: null } },
        select: { id: true, summary: true },
      })
    : [];
  const summaryMap = new Map(summaries.map((p) => [p.id, p.summary]));

  const posts = top10.map((r, i) => ({
    rank: i + 1,
    messageId: r.messageId,
    tgUrl: `https://t.me/${username}/${r.messageId}`,
    text: r.text ? (r.text.length > 80 ? r.text.slice(0, 80) + "..." : r.text) : null,
    summary: r.postId ? summaryMap.get(r.postId) ?? null : null,
    views: r.views,
    forwards: r.forwards,
    replies: r.replies,
    postedAt: r.postedAt,
    isViral: ((r[metric] as number) ?? 0) > medianValue * 3,
  }));

  return NextResponse.json({
    metric,
    period,
    medianViews: medianValue,
    posts,
  });
}
