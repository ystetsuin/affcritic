import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { logPipeline } from "../../../lib/logger";

export async function GET(request: NextRequest) {
  const isAdmin = request.nextUrl.searchParams.get("admin") === "1";

  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      categoryMap: {
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  if (!isAdmin) {
    const result = channels.map((ch) => ({
      id: ch.id,
      username: ch.username,
      displayName: ch.displayName,
      isActive: ch.isActive,
      createdAt: ch.createdAt,
      categories: ch.categoryMap.map((m) => m.category),
    }));
    return NextResponse.json(result);
  }

  // Admin mode: attach per-channel stats via single GROUP BY query
  const rawStats = await prisma.$queryRaw<Array<{
    channel_id: string;
    raw_total: bigint;
    raw_24h: bigint;
    raw_7d: bigint;
    last_post_at: Date | null;
  }>>`
    SELECT
      channel_id,
      COUNT(*) AS raw_total,
      COUNT(*) FILTER (WHERE posted_at > NOW() - INTERVAL '24 hours') AS raw_24h,
      COUNT(*) FILTER (WHERE posted_at > NOW() - INTERVAL '7 days') AS raw_7d,
      MAX(posted_at) AS last_post_at
    FROM raw_posts
    GROUP BY channel_id
  `;

  const feedStats = await prisma.$queryRaw<Array<{
    channel_id: string;
    feed_posts: bigint;
  }>>`
    SELECT
      ps.channel_id,
      COUNT(DISTINCT ps.post_id) AS feed_posts
    FROM post_sources ps
    JOIN posts p ON p.id = ps.post_id
    WHERE p.is_deleted = false AND p.summary IS NOT NULL
    GROUP BY ps.channel_id
  `;

  const rawMap = new Map(rawStats.map((r) => [r.channel_id, r]));
  const feedMap = new Map(feedStats.map((f) => [f.channel_id, Number(f.feed_posts)]));

  const result = channels.map((ch) => {
    const raw = rawMap.get(ch.id);
    const rawTotal = raw ? Number(raw.raw_total) : 0;
    const feedPosts = feedMap.get(ch.id) ?? 0;
    return {
      id: ch.id,
      username: ch.username,
      displayName: ch.displayName,
      isActive: ch.isActive,
      createdAt: ch.createdAt,
      categories: ch.categoryMap.map((m) => m.category),
      rawPostsTotal: rawTotal,
      rawPosts24h: raw ? Number(raw.raw_24h) : 0,
      rawPosts7d: raw ? Number(raw.raw_7d) : 0,
      feedPosts,
      uniquePercent: rawTotal > 0 ? Math.round((feedPosts / rawTotal) * 100) : null,
      lastPostAt: raw?.last_post_at?.toISOString() ?? null,
    };
  });

  return NextResponse.json(result);
}

const USERNAME_RE = /^[a-z][a-z0-9_]{3,31}$/;

export async function POST(request: NextRequest) {
  let body: { username?: string; displayName?: string; categoryIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username = body.username?.trim().toLowerCase().replace(/^@/, "");

  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Invalid username format. Must be 4-32 chars: lowercase letters, digits, underscores. Must start with a letter." },
      { status: 400 },
    );
  }

  // Check uniqueness
  const existing = await prisma.channel.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Channel already exists" }, { status: 409 });
  }

  const categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds : [];

  const channel = await prisma.channel.create({
    data: {
      username,
      displayName: body.displayName?.trim() || null,
      ...(categoryIds.length > 0 && {
        categoryMap: {
          create: categoryIds.map((cid) => ({ categoryId: cid })),
        },
      }),
    },
  });

  await logPipeline("admin", null, {
    action: "create_channel",
    details: { username, categoryIds: categoryIds.length > 0 ? categoryIds : undefined },
  });

  return NextResponse.json(channel, { status: 201 });
}
