import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import type { Prisma } from "../../../generated/prisma/client";

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status"); // active, pending, or null (all)
  const category = searchParams.get("category"); // category slug

  const where: Prisma.TagWhereInput = {};

  if (status === "active" || status === "pending") {
    where.status = status;
  }
  if (category) {
    where.category = { slug: category };
  }

  const tags = await prisma.tag.findMany({
    where,
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    include: {
      category: { select: { id: true, name: true, slug: true } },
      _count: { select: { postTags: true } },
    },
  });

  const result = tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    status: tag.status,
    category: tag.category,
    postsCount: tag._count.postTags,
    createdAt: tag.createdAt,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  let body: { name?: string; slug?: string; categoryId?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const slug = body.slug?.trim().toLowerCase();
  const categoryId = body.categoryId;
  const tagStatus = body.status === "active" ? "active" as const : "pending" as const;

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  if (!categoryId) return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  if (!SLUG_RE.test(slug)) return NextResponse.json({ error: "Invalid slug format" }, { status: 400 });

  const categoryExists = await prisma.tagCategory.findUnique({ where: { id: categoryId } });
  if (!categoryExists) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const slugConflict = await prisma.tag.findUnique({ where: { slug } });
  if (slugConflict) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });

  const tag = await prisma.tag.create({
    data: { name, slug, categoryId, status: tagStatus },
  });

  return NextResponse.json(tag, { status: 201 });
}
