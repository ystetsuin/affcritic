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

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: postInclude,
    }),
    prisma.post.count({ where }),
  ]);

  const serialized = posts.map(serializePost);

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
} as const;

function serializePost(post: Record<string, unknown>): PostData {
  return JSON.parse(JSON.stringify(post));
}
