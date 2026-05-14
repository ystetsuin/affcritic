import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { logPipeline } from "../../../../lib/logger";

export async function POST(request: NextRequest) {
  let body: { tagIds?: string[]; categoryId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { tagIds, categoryId } = body;

  if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
    return NextResponse.json({ error: "tagIds must be a non-empty array" }, { status: 400 });
  }

  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  }

  try {
    const category = await prisma.tagCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const result = await prisma.tag.updateMany({
      where: { id: { in: tagIds } },
      data: { categoryId },
    });

    await logPipeline("admin", null, {
      action: "bulk_move_tags",
      tagIds,
      targetCategoryId: categoryId,
      targetCategoryName: category.name,
      count: result.count,
    });

    return NextResponse.json({ moved: result.count });
  } catch (err) {
    console.error("bulk-move error:", err);
    return NextResponse.json({ error: "Failed to move tags" }, { status: 500 });
  }
}
