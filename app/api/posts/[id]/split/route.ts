import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { logPipeline } from "../../../../../lib/logger";
import { generateSummaryForGroup } from "../../../../../lib/openai";
import { getActiveTagsList } from "../../../../../lib/prompts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let body: { sourceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sourceId = body.sourceId;
  if (!sourceId) {
    return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
  }

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.isDeleted) return NextResponse.json({ error: "Post is deleted" }, { status: 400 });

  // Verify source belongs to this post
  const source = await prisma.postSource.findUnique({ where: { id: sourceId } });
  if (!source || source.postId !== id) {
    return NextResponse.json({ error: "Source not found in this post" }, { status: 404 });
  }

  // Must have at least 2 sources to split
  const sourceCount = await prisma.postSource.count({ where: { postId: id } });
  if (sourceCount < 2) {
    return NextResponse.json({ error: "Cannot split post with only 1 source" }, { status: 400 });
  }

  let newPostId: string;

  await prisma.$transaction(async (tx) => {
    // Create new post
    const newPost = await tx.post.create({
      data: { isManuallyGrouped: true },
    });
    newPostId = newPost.id;

    // Move the source to new post
    await tx.postSource.update({
      where: { id: sourceId },
      data: { postId: newPost.id },
    });

    // Move corresponding raw_post if exists
    await tx.rawPost.updateMany({
      where: {
        channelId: source.channelId,
        messageId: source.messageId,
        postId: id,
      },
      data: { postId: newPost.id },
    });

    // Mark both as manually grouped, reset manually edited
    await tx.post.update({
      where: { id },
      data: { isManuallyGrouped: true, isManuallyEdited: false },
    });
  });

  // Regenerate summaries for both posts
  const tagList = await getActiveTagsList();
  await Promise.all([
    generateSummaryForGroup(id, tagList),
    generateSummaryForGroup(newPostId!, tagList),
  ]);

  await logPipeline("admin", id, { action: "split_post", details: { originalPostId: id, newPostId: newPostId!, sourceId } });

  return NextResponse.json({
    originalPostId: id,
    newPostId: newPostId!,
  });
}
