import { prisma } from "./db";
import { bufferToEmbedding } from "./openai";
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

  const rawPosts = await prisma.rawPost.findMany({
    where: {
      processed: false,
      embedding: { not: null },
      postId: null,
    },
    include: {
      channel: { select: { username: true } },
    },
    orderBy: { postedAt: "asc" },
  });

  for (const rawPost of rawPosts) {
    if (!rawPost.embedding) {
      console.warn(`[grouping] raw_post ${rawPost.id} has no embedding — skipping`);
      continue;
    }

    const embedding = bufferToEmbedding(Buffer.from(rawPost.embedding));
    const similar = await findSimilarPosts(embedding, rawPost.id);

    const tgUrl = `https://t.me/${rawPost.channel.username}/${rawPost.messageId}`;

    // Build top-3 similarities for logging (include all, even below threshold)
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
            channelId: rawPost.channelId,
            messageId: rawPost.messageId,
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
  rawPost: { id: string; channelId: string; messageId: number; text: string | null },
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
        channelId: rawPost.channelId,
        messageId: rawPost.messageId,
        originalText: rawPost.text,
        tgUrl,
      },
    });

    return post.id;
  });

  changedGroupIds.add(postId);
  return postId;
}
