import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export async function GET() {
  const categories = await prisma.tagCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { tags: true } },
    },
  });

  const result = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    sortOrder: cat.sortOrder,
    tagsCount: cat._count.tags,
  }));

  return NextResponse.json(result);
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

export async function POST(request: NextRequest) {
  let body: { name?: string; slug?: string; sortOrder?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const slug = body.slug?.trim().toLowerCase();

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Invalid slug format" }, { status: 400 });
  }

  const existing = await prisma.tagCategory.findUnique({ where: { slug } });
  if (existing) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });

  const category = await prisma.tagCategory.create({
    data: { name, slug, sortOrder: body.sortOrder ?? 0 },
  });

  return NextResponse.json(category, { status: 201 });
}
