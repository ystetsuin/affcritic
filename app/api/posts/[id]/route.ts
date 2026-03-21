import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      postSources: {
        include: {
          channel: { select: { username: true, displayName: true } },
        },
        orderBy: { id: "asc" },
      },
      postTags: {
        where: { tag: { status: "active" } },
        include: {
          tag: {
            select: {
              name: true,
              slug: true,
              category: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
  });

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  return NextResponse.json(post);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let body: { isDeleted?: boolean; summary?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const data: { isDeleted?: boolean; summary?: string; isManuallyEdited?: boolean } = {};

  if (body.isDeleted !== undefined) {
    data.isDeleted = body.isDeleted;
  }

  if (body.summary !== undefined) {
    data.summary = body.summary;
    data.isManuallyEdited = true;
  }

  const post = await prisma.post.update({ where: { id }, data });
  return NextResponse.json(post);
}
