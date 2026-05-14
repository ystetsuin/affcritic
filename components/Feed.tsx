import { prisma } from "@/lib/db";
import { FeedClient } from "./FeedClient";
import type { PostData } from "./PostCard";
import { periodToDate, parsePeriod, type Period } from "@/lib/period";

const PAGE_SIZE = 20;

export async function Feed({
  folder,
  channel,
  tag,
  period: rawPeriod,
}: {
  folder?: string;
  channel?: string;
  tag?: string;
  period?: string;
} = {}) {
  const period = parsePeriod(rawPeriod);
  const where = buildWhere({ folder, channel, tag, period });

  let serialized: PostData[] = [];
  let total = 0;

  try {
    const [posts, count] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        include: postInclude,
      }),
      prisma.post.count({ where }),
    ]);
    serialized = posts.map(serializePost);
    total = count;
  } catch {
    // DB quota exceeded or connection error — render empty feed
  }

  return (
    <FeedClient
      initialPosts={serialized}
      total={total}
      pageSize={PAGE_SIZE}
      folder={folder}
      channel={channel}
      tag={tag}
      period={period}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────

function buildWhere({
  folder,
  channel,
  tag,
  period,
}: {
  folder?: string;
  channel?: string;
  tag?: string;
  period?: Period;
}) {
  const and: Record<string, unknown>[] = [{ isDeleted: false, summary: { not: null } }];

  if (period) {
    const since = periodToDate(period);
    if (since) {
      and.push({ createdAt: { gte: since } });
    }
  }

  if (folder) {
    and.push({
      postSources: {
        some: {
          channel: {
            categoryMap: { some: { category: { slug: folder } } },
          },
        },
      },
    });
  }
  if (channel) {
    and.push({
      postSources: { some: { channel: { username: channel } } },
    });
  }
  if (tag) {
    and.push({
      postTags: { some: { tag: { slug: tag, status: "active" } } },
    });
  }

  return { AND: and };
}

const postInclude = {
  postSources: {
    include: {
      channel: { select: { username: true, displayName: true } },
    },
    orderBy: { id: "asc" as const },
  },
  postTags: {
    where: { tag: { status: "active" as const } },
    include: {
      tag: {
        select: {
          name: true,
          slug: true,
          category: { select: { name: true, slug: true } },
        },
      },
    },
  },
  rawPosts: {
    select: { postedAt: true },
    where: { postedAt: { not: null } },
    orderBy: { postedAt: "asc" as const },
    take: 1,
  },
} as const;

function serializePost(post: Record<string, unknown>): PostData {
  const raw = JSON.parse(JSON.stringify(post));
  const publishedAt = raw.rawPosts?.[0]?.postedAt ?? null;
  delete raw.rawPosts;
  return { ...raw, publishedAt };
}
