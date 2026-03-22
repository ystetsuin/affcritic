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
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  const updates = ids.map((id, i) =>
    prisma.channelCategory.update({ where: { id }, data: { sortOrder: i } }),
  );

  await prisma.$transaction(updates);

  await logPipeline("admin", null, {
    action: "reorder_channel_categories",
    details: { ids },
  });

  return NextResponse.json({ ok: true });
}
