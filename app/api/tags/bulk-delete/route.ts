import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { logPipeline } from "../../../../lib/logger";

export async function POST(request: NextRequest) {
  let body: { tagIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { tagIds } = body;

  if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
    return NextResponse.json({ error: "tagIds must be a non-empty array" }, { status: 400 });
  }

  try {
    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true, name: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.postTag.deleteMany({ where: { tagId: { in: tagIds } } });
      await tx.tagAlias.deleteMany({ where: { tagId: { in: tagIds } } });
      await tx.tag.deleteMany({ where: { id: { in: tagIds } } });
    });

    await logPipeline("admin", null, {
      action: "bulk_delete_tags",
      tagIds,
      tagNames: tags.map((t) => t.name),
      count: tags.length,
    });

    return NextResponse.json({ deleted: tags.length });
  } catch (err) {
    console.error("bulk-delete error:", err);
    return NextResponse.json({ error: "Failed to delete tags" }, { status: 500 });
  }
}
