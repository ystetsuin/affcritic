import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { logPipeline } from "../../../../lib/logger";

export async function POST(request: NextRequest) {
  let body: { channelIds?: string[]; isActive?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { channelIds, isActive } = body;
  if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
    return NextResponse.json({ error: "channelIds must be a non-empty array" }, { status: 400 });
  }
  if (typeof isActive !== "boolean") {
    return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
  }

  try {
    const result = await prisma.channel.updateMany({
      where: { id: { in: channelIds } },
      data: { isActive },
    });

    await logPipeline("admin", null, {
      action: "bulk_channel_status",
      channelIds,
      isActive,
      count: result.count,
    });

    return NextResponse.json({ updated: result.count });
  } catch (err) {
    console.error("bulk-status error:", err);
    return NextResponse.json({ error: "Failed to update channels" }, { status: 500 });
  }
}
