import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { logPipeline } from "../../../../../lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let body: { tagId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tagId = body.tagId;
  if (!tagId) return NextResponse.json({ error: "tagId is required" }, { status: 400 });

  const [post, tag] = await Promise.all([
    prisma.post.findUnique({ where: { id } }),
    prisma.tag.findUnique({ where: { id: tagId } }),
  ]);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });

  // Check if already linked
  const existing = await prisma.postTag.findFirst({
    where: { postId: id, tagId },
  });
  if (existing) return NextResponse.json({ error: "Tag already on post" }, { status: 409 });

  const postTag = await prisma.postTag.create({
    data: { postId: id, tagId },
  });

  await logPipeline("admin", id, { action: "add_post_tag", details: { postId: id, tagId, tagName: tag.name } });

  return NextResponse.json(postTag, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const tagId = request.nextUrl.searchParams.get("tagId");

  if (!tagId) return NextResponse.json({ error: "tagId query param required" }, { status: 400 });

  const postTag = await prisma.postTag.findFirst({
    where: { postId: id, tagId },
  });
  if (!postTag) return NextResponse.json({ error: "Post-tag link not found" }, { status: 404 });

  await prisma.postTag.delete({ where: { id: postTag.id } });

  await logPipeline("admin", id, { action: "remove_post_tag", details: { postId: id, tagId } });

  return NextResponse.json({ ok: true });
}
