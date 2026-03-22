import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { logPipeline } from "../../../lib/logger";

export async function GET() {
  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      categoryMap: {
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  const result = channels.map((ch) => ({
    id: ch.id,
    username: ch.username,
    displayName: ch.displayName,
    isActive: ch.isActive,
    createdAt: ch.createdAt,
    categories: ch.categoryMap.map((m) => m.category),
  }));

  return NextResponse.json(result);
}

const USERNAME_RE = /^[a-z][a-z0-9_]{3,31}$/;

export async function POST(request: NextRequest) {
  let body: { username?: string; displayName?: string; categoryIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username = body.username?.trim().toLowerCase().replace(/^@/, "");

  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Invalid username format. Must be 4-32 chars: lowercase letters, digits, underscores. Must start with a letter." },
      { status: 400 },
    );
  }

  // Check uniqueness
  const existing = await prisma.channel.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Channel already exists" }, { status: 409 });
  }

  const categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds : [];

  const channel = await prisma.channel.create({
    data: {
      username,
      displayName: body.displayName?.trim() || null,
      ...(categoryIds.length > 0 && {
        categoryMap: {
          create: categoryIds.map((cid) => ({ categoryId: cid })),
        },
      }),
    },
  });

  await logPipeline("admin", null, {
    action: "create_channel",
    details: { username, categoryIds: categoryIds.length > 0 ? categoryIds : undefined },
  });

  return NextResponse.json(channel, { status: 201 });
}
