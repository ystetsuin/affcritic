import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { logPipeline } from "../../../../lib/logger";

export async function POST(request: NextRequest) {
  let body: { channelIds?: string[]; categoryId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { channelIds, categoryId } = body;
  if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
    return NextResponse.json({ error: "channelIds must be a non-empty array" }, { status: 400 });
  }
  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  }

  try {
    const category = await prisma.channelCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Find already linked to skip dupes
    const existing = await prisma.channelCategoryMap.findMany({
      where: { categoryId, channelId: { in: channelIds } },
      select: { channelId: true },
    });
    const existingSet = new Set(existing.map((e) => e.channelId));
    const toAdd = channelIds.filter((id) => !existingSet.has(id));

    if (toAdd.length > 0) {
      await prisma.channelCategoryMap.createMany({
        data: toAdd.map((channelId) => ({ channelId, categoryId })),
      });
    }

    await logPipeline("admin", null, {
      action: "bulk_add_category",
      channelIds,
      categoryId,
      categoryName: category.name,
      count: toAdd.length,
    });

    return NextResponse.json({ added: toAdd.length });
  } catch (err) {
    console.error("bulk-add-category error:", err);
    return NextResponse.json({ error: "Failed to add category" }, { status: 500 });
  }
}
