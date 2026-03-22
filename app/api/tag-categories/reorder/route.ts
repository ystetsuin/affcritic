import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { logPipeline } from "../../../../lib/logger";

export async function POST(request: NextRequest) {
  let body: { ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ids = body.ids;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.tagCategory.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  await logPipeline("admin", null, {
    action: "reorder_tag_categories",
    details: { order: ids },
  });

  return NextResponse.json({ ok: true });
}
