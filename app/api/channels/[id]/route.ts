import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { logPipeline } from "../../../../lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const channel = await prisma.channel.findUnique({
    where: { id },
    include: {
      categoryMap: {
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: channel.id,
    username: channel.username,
    displayName: channel.displayName,
    isActive: channel.isActive,
    createdAt: channel.createdAt,
    categories: channel.categoryMap.map((m) => m.category),
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let body: { displayName?: string; isActive?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.channel.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const data: { displayName?: string | null; isActive?: boolean } = {};
  if (body.displayName !== undefined) {
    data.displayName = body.displayName?.trim() || null;
  }
  if (body.isActive !== undefined) {
    data.isActive = body.isActive;
  }

  const channel = await prisma.channel.update({ where: { id }, data });

  await logPipeline("admin", null, { action: "update_channel", details: { id, changes: data } });

  return NextResponse.json(channel);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const existing = await prisma.channel.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Cascade delete is handled by Prisma schema (onDelete: Cascade on ChannelCategoryMap)
  await prisma.channel.delete({ where: { id } });

  await logPipeline("admin", null, { action: "delete_channel", details: { id, username: existing.username } });

  return NextResponse.json({ ok: true });
}
