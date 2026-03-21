import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const category = await prisma.channelCategory.findUnique({ where: { id } });
  if (!category) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const mappings = await prisma.channelCategoryMap.findMany({
    where: { categoryId: id },
    include: {
      channel: {
        select: { id: true, username: true, displayName: true, isActive: true },
      },
    },
  });

  return NextResponse.json(mappings.map((m) => m.channel));
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let body: { channelId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const channelId = body.channelId;
  if (!channelId) {
    return NextResponse.json({ error: "channelId is required" }, { status: 400 });
  }

  // Verify both exist
  const [category, channel] = await Promise.all([
    prisma.channelCategory.findUnique({ where: { id } }),
    prisma.channel.findUnique({ where: { id: channelId } }),
  ]);

  if (!category) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Check if already linked
  const existing = await prisma.channelCategoryMap.findUnique({
    where: { categoryId_channelId: { categoryId: id, channelId } },
  });

  if (existing) {
    return NextResponse.json({ error: "Channel already in this folder" }, { status: 409 });
  }

  await prisma.channelCategoryMap.create({
    data: { categoryId: id, channelId },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const channelId = searchParams.get("channelId");

  if (!channelId) {
    return NextResponse.json({ error: "channelId query param is required" }, { status: 400 });
  }

  const existing = await prisma.channelCategoryMap.findUnique({
    where: { categoryId_channelId: { categoryId: id, channelId } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
  }

  await prisma.channelCategoryMap.delete({
    where: { categoryId_channelId: { categoryId: id, channelId } },
  });

  return NextResponse.json({ ok: true });
}
