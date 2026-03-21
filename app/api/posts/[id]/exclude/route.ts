import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
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

  const source = await prisma.postSource.findUnique({ where: { id: sourceId } });
  if (!source || source.postId !== id) {
    return NextResponse.json({ error: "Source not found in this post" }, { status: 404 });
  }

  // Check remaining sources count
  const sourceCount = await prisma.postSource.count({ where: { postId: id } });

  await prisma.$transaction(async (tx) => {
    // Delete the source
    await tx.postSource.delete({ where: { id: sourceId } });

    // Unlink corresponding raw_post
    await tx.rawPost.updateMany({
      where: {
        channelId: source.channelId,
        messageId: source.messageId,
        postId: id,
      },
      data: { postId: null },
    });

    if (sourceCount <= 1) {
      // No sources left — soft delete post
      await tx.post.update({
        where: { id },
        data: { isDeleted: true },
      });
    }
  });

  if (sourceCount > 1) {
    // Regenerate summary with remaining sources
    const tagList = await getActiveTagsList();
    await generateSummaryForGroup(id, tagList);
  }

  return NextResponse.json({
    postId: id,
    deleted: sourceCount <= 1,
    remainingSources: Math.max(0, sourceCount - 1),
  });
}
