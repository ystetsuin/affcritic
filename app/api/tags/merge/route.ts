import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export async function POST(request: NextRequest) {
  let body: { sourceId?: string; targetId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sourceId, targetId } = body;
  if (!sourceId || !targetId) {
    return NextResponse.json({ error: "sourceId and targetId are required" }, { status: 400 });
  }
  if (sourceId === targetId) {
    return NextResponse.json({ error: "sourceId and targetId must be different" }, { status: 400 });
  }

  const [source, target] = await Promise.all([
    prisma.tag.findUnique({ where: { id: sourceId } }),
    prisma.tag.findUnique({ where: { id: targetId } }),
  ]);

  if (!source) return NextResponse.json({ error: "Source tag not found" }, { status: 404 });
  if (!target) return NextResponse.json({ error: "Target tag not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // Get all post_tags for source
    const sourcePostTags = await tx.postTag.findMany({
      where: { tagId: sourceId },
      select: { postId: true },
    });

    // Get existing post_tags for target to avoid duplicates
    const targetPostIds = new Set(
      (await tx.postTag.findMany({
        where: { tagId: targetId },
        select: { postId: true },
      })).map((pt) => pt.postId),
    );

    // Create new post_tags for target (only for posts that don't already have it)
    const newPostTags = sourcePostTags
      .filter((pt) => !targetPostIds.has(pt.postId))
      .map((pt) => ({ postId: pt.postId, tagId: targetId }));

    if (newPostTags.length > 0) {
      await tx.postTag.createMany({ data: newPostTags });
    }

    // Delete source tag (cascades post_tags)
    await tx.tag.delete({ where: { id: sourceId } });
  });

  return NextResponse.json({ ok: true, merged: source.name, into: target.name });
}
