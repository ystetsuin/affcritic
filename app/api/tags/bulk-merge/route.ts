import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { logPipeline } from "../../../../lib/logger";

export async function POST(request: NextRequest) {
  let body: { sourceIds?: string[]; targetId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sourceIds, targetId } = body;

  if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
    return NextResponse.json({ error: "sourceIds must be a non-empty array" }, { status: 400 });
  }
  if (!targetId) {
    return NextResponse.json({ error: "targetId is required" }, { status: 400 });
  }
  if (sourceIds.includes(targetId)) {
    return NextResponse.json({ error: "targetId must not be in sourceIds" }, { status: 400 });
  }

  try {
    const target = await prisma.tag.findUnique({ where: { id: targetId } });
    if (!target) {
      return NextResponse.json({ error: "Target tag not found" }, { status: 404 });
    }

    const sources = await prisma.tag.findMany({
      where: { id: { in: sourceIds } },
      select: { id: true, name: true },
    });

    await prisma.$transaction(async (tx) => {
      // 1. Transfer post_tags: get existing target post IDs to skip dupes
      const targetPostIds = new Set(
        (await tx.postTag.findMany({
          where: { tagId: targetId },
          select: { postId: true },
        })).map((pt) => pt.postId),
      );

      const sourcePostTags = await tx.postTag.findMany({
        where: { tagId: { in: sourceIds } },
        select: { postId: true },
      });

      const newPostTags = sourcePostTags
        .filter((pt) => !targetPostIds.has(pt.postId))
        .map((pt) => ({ postId: pt.postId, tagId: targetId }));

      // Dedupe within newPostTags (multiple sources may reference same post)
      const seen = new Set<string>();
      const uniquePostTags = newPostTags.filter((pt) => {
        if (seen.has(pt.postId)) return false;
        seen.add(pt.postId);
        return true;
      });

      if (uniquePostTags.length > 0) {
        await tx.postTag.createMany({ data: uniquePostTags });
      }

      // 2. Delete source post_tags
      await tx.postTag.deleteMany({ where: { tagId: { in: sourceIds } } });

      // 3. Transfer aliases from sources to target
      await tx.tagAlias.updateMany({
        where: { tagId: { in: sourceIds } },
        data: { tagId: targetId },
      });

      // 4. Add source names as new aliases of target
      const existingAliases = new Set(
        (await tx.tagAlias.findMany({
          where: { tagId: targetId },
          select: { alias: true },
        })).map((a) => a.alias.toLowerCase()),
      );

      const newAliases = sources
        .filter((s) => s.name.toLowerCase() !== target.name.toLowerCase() && !existingAliases.has(s.name.toLowerCase()))
        .map((s) => ({ tagId: targetId, alias: s.name }));

      if (newAliases.length > 0) {
        await tx.tagAlias.createMany({ data: newAliases });
      }

      // 5. Delete source tags
      await tx.tag.deleteMany({ where: { id: { in: sourceIds } } });
    });

    await logPipeline("admin", null, {
      action: "bulk_merge_tags",
      sourceIds,
      sourceNames: sources.map((s) => s.name),
      targetId,
      targetName: target.name,
      count: sources.length,
    });

    return NextResponse.json({ merged: sources.length });
  } catch (err) {
    console.error("bulk-merge error:", err);
    return NextResponse.json({ error: "Failed to merge tags" }, { status: 500 });
  }
}
