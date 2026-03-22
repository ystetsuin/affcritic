import { prisma } from "@/lib/db";
import { FeedClient } from "./FeedClient";
import type { PostData } from "./PostCard";

const PAGE_SIZE = 20;

export async function Feed({
  folder,
  channel,
  tag,
}: {
  folder?: string;
  channel?: string;
  tag?: string;
} = {}) {
  const where = buildWhere({ folder, channel, tag });

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
    />
  );
}

// ─── Helpers ──────────────────────────────────────────

function buildWhere({
  folder,
  channel,
  tag,
}: {
  folder?: string;
  channel?: string;
  tag?: string;
}) {
  const and: Record<string, unknown>[] = [{ isDeleted: false, summary: { not: null } }];

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
