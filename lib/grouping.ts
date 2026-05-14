import { prisma } from "./db";
import { findSimilarPosts, SIMILARITY_THRESHOLD } from "./dedup";
import { logPipeline } from "./logger";

/**
 * Group all unprocessed raw_posts that have embeddings.
 * For each raw_post:
 *   - similarity > 0.83 → join existing group (unless is_manually_grouped)
 *   - similarity < 0.83 → create new group
 * Creates post_sources for every grouped raw_post.
 * Returns the set of group (post) IDs that were changed in this batch.
 */
export async function groupNewPosts(): Promise<Set<string>> {
  const changedGroupIds = new Set<string>();

  // Fetch unprocessed raw_posts that have embeddings (raw SQL since embedding is Unsupported)
  const rawPosts = await prisma.$queryRaw<
    { id: string; channel_id: string; message_id: number; text: string | null; username: string }[]
  >`
    SELECT rp.id, rp.channel_id, rp.message_id, rp.text, c.username
    FROM raw_posts rp
    JOIN channels c ON c.id = rp.channel_id
    WHERE rp.processed = false
      AND rp.embedding IS NOT NULL
      AND rp.post_id IS NULL
    ORDER BY rp.posted_at ASC
  `;

  for (const rawPost of rawPosts) {
    // Find similar posts via pgvector (cosine similarity in SQL)
    const similar = await findSimilarPosts(rawPost.id);

    const tgUrl = `https://t.me/${rawPost.username}/${rawPost.message_id}`;

    // Build top-3 similarities for logging
    const topSimilarities = similar.slice(0, 3).map((s) => ({
      group_id: s.postId,
      score: parseFloat(s.similarity.toFixed(4)),
    }));
    const skippedProtectedGroups: { group_id: string; score: number }[] = [];

    // Find best non-protected group among similar posts
    let joinedGroup = false;
    let targetGroupId: string | null = null;

    for (const match of similar) {
      if (!match.postId) continue;

      const targetPost = await prisma.post.findUnique({
        where: { id: match.postId },
        select: { isManuallyGrouped: true },
      });

      if (targetPost?.isManuallyGrouped) {
        console.log(
          `[grouping] Post ${rawPost.id} skipped protected group ${match.postId}, similarity=${match.similarity.toFixed(4)}`,
        );
        skippedProtectedGroups.push({
          group_id: match.postId,
          score: parseFloat(match.similarity.toFixed(4)),
        });
        continue;
      }

      // Join this group + reset is_manually_edited (new source triggers re-summary)
      await prisma.$transaction([
        prisma.rawPost.update({
          where: { id: rawPost.id },
          data: { postId: match.postId },
        }),
        prisma.postSource.create({
          data: {
            postId: match.postId,
            channelId: rawPost.channel_id,
            messageId: rawPost.message_id,
            originalText: rawPost.text,
            tgUrl,
          },
        }),
        prisma.post.update({
          where: { id: match.postId },
          data: { isManuallyEdited: false },
        }),
      ]);

      console.log(`[grouping] Group ${match.postId}: is_manually_edited reset (new source added)`);

      changedGroupIds.add(match.postId);
      targetGroupId = match.postId;
      joinedGroup = true;
      break;
    }

    if (!joinedGroup) {
      targetGroupId = await createNewGroup(rawPost, tgUrl, changedGroupIds);
    }

    // Log grouping decision
    await logPipeline("grouping", targetGroupId, {
      raw_post_id: rawPost.id,
      decision: joinedGroup ? "joined_existing" : "new_group",
      target_group_id: targetGroupId,
      top_similarities: topSimilarities,
      skipped_protected_groups: skippedProtectedGroups,
      threshold: SIMILARITY_THRESHOLD,
    });
  }

  return changedGroupIds;
}

async function createNewGroup(
  rawPost: { id: string; channel_id: string; message_id: number; text: string | null },
  tgUrl: string,
  changedGroupIds: Set<string>,
): Promise<string> {
  const postId = await prisma.$transaction(async (tx) => {
    const post = await tx.post.create({ data: {} });

    await tx.rawPost.update({
      where: { id: rawPost.id },
      data: { postId: post.id },
    });

    await tx.postSource.create({
      data: {
        postId: post.id,
        channelId: rawPost.channel_id,
        messageId: rawPost.message_id,
        originalText: rawPost.text,
        tgUrl,
      },
    });

    return post.id;
  });

  changedGroupIds.add(postId);
  return postId;
}
