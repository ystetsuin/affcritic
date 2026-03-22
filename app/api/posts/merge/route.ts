import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { logPipeline } from "../../../../lib/logger";
import { generateSummaryForGroup } from "../../../../lib/openai";
import { getActiveTagsList } from "../../../../lib/prompts";

export async function POST(request: NextRequest) {
  let body: { postIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const postIds = body.postIds;
  if (!postIds || postIds.length < 2) {
    return NextResponse.json({ error: "At least 2 postIds required" }, { status: 400 });
  }

  // Verify all posts exist and are not deleted
  const posts = await prisma.post.findMany({
    where: { id: { in: postIds } },
    select: { id: true, isDeleted: true },
  });

  if (posts.length !== postIds.length) {
    return NextResponse.json({ error: "One or more posts not found" }, { status: 404 });
  }

  const deletedPost = posts.find((p) => p.isDeleted);
  if (deletedPost) {
    return NextResponse.json({ error: `Post ${deletedPost.id} is deleted` }, { status: 400 });
  }

  const targetId = postIds[0];
  const sourceIds = postIds.slice(1);

  await prisma.$transaction(async (tx) => {
    // Move all post_sources from source posts to target
    await tx.postSource.updateMany({
      where: { postId: { in: sourceIds } },
      data: { postId: targetId },
    });

    // Move raw_posts references
    await tx.rawPost.updateMany({
      where: { postId: { in: sourceIds } },
      data: { postId: targetId },
    });

    // Move post_tags from sources to target (delete existing target tags first to avoid conflicts)
    await tx.postTag.deleteMany({ where: { postId: targetId } });
    await tx.postTag.updateMany({
      where: { postId: { in: sourceIds } },
      data: { postId: targetId },
    });

    // Soft-delete source posts
    await tx.post.updateMany({
      where: { id: { in: sourceIds } },
      data: { isDeleted: true },
    });

    // Mark target as manually grouped
    await tx.post.update({
      where: { id: targetId },
      data: { isManuallyGrouped: true, isManuallyEdited: false },
    });
  });

  // Regenerate summary for target
  const tagList = await getActiveTagsList();
  await generateSummaryForGroup(targetId, tagList);

  const result = await prisma.post.findUnique({
    where: { id: targetId },
    include: {
      postSources: { orderBy: { id: "asc" } },
      _count: { select: { postSources: true } },
    },
  });

  await logPipeline("admin", targetId, { action: "merge_posts", details: { sourcePostIds: sourceIds, targetPostId: targetId } });

  return NextResponse.json(result);
}
