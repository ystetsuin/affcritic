import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { logPipeline } from "../../../../lib/logger";

export async function POST(request: NextRequest) {
  let body: { channelIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { channelIds } = body;
  if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
    return NextResponse.json({ error: "channelIds must be a non-empty array" }, { status: 400 });
  }

  try {
    const channels = await prisma.channel.findMany({
      where: { id: { in: channelIds } },
      select: { id: true, username: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.channelCategoryMap.deleteMany({ where: { channelId: { in: channelIds } } });
      await tx.channel.deleteMany({ where: { id: { in: channelIds } } });
    });

    await logPipeline("admin", null, {
      action: "bulk_delete_channels",
      channelIds,
      channelNames: channels.map((c) => c.username),
      count: channels.length,
    });

    return NextResponse.json({ deleted: channels.length });
  } catch (err) {
    console.error("bulk-delete error:", err);
    return NextResponse.json({ error: "Failed to delete channels" }, { status: 500 });
  }
}
