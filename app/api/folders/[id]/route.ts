import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { logPipeline } from "../../../../lib/logger";

const RESERVED_SLUGS = new Set(["about", "admin", "tag", "api"]);
const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const category = await prisma.channelCategory.findUnique({
    where: { id },
    include: {
      categoryMap: {
        include: {
          channel: {
            select: { id: true, username: true, displayName: true, isActive: true },
          },
        },
      },
    },
  });

  if (!category) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: category.id,
    name: category.name,
    slug: category.slug,
    createdAt: category.createdAt,
    channels: category.categoryMap.map((m) => m.channel),
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let body: { name?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.channelCategory.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const data: { name?: string; slug?: string } = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    data.name = name;
  }

  if (body.slug !== undefined) {
    const slug = body.slug.trim().toLowerCase();
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "Invalid slug format" }, { status: 400 });
    }
    if (RESERVED_SLUGS.has(slug)) {
      return NextResponse.json({ error: `Slug "${slug}" is reserved` }, { status: 400 });
    }
    const conflict = await prisma.channelCategory.findUnique({ where: { slug } });
    if (conflict && conflict.id !== id) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    data.slug = slug;
  }

  const category = await prisma.channelCategory.update({ where: { id }, data });

  await logPipeline("admin", null, { action: "update_folder", details: { id, changes: data } });

  return NextResponse.json(category);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const existing = await prisma.channelCategory.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  // Cascade: ChannelCategoryMap onDelete: Cascade in Prisma schema
  await prisma.channelCategory.delete({ where: { id } });

  await logPipeline("admin", null, { action: "delete_folder", details: { id, slug: existing.slug } });

  return NextResponse.json({ ok: true });
}
