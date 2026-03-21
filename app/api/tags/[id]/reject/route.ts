import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });

  if (tag.status !== "pending") {
    return NextResponse.json({ error: "Only pending tags can be rejected" }, { status: 400 });
  }

  // Delete post_tags first (cascade), then delete tag
  await prisma.tag.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
