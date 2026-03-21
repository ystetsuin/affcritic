import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

const RESERVED_SLUGS = new Set(["about", "admin", "tag", "api"]);
const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

export async function GET() {
  const categories = await prisma.channelCategory.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { categoryMap: true } },
    },
  });

  const result = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    createdAt: cat.createdAt,
    channelsCount: cat._count.categoryMap,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  let body: { name?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const slug = body.slug?.trim().toLowerCase();

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "Invalid slug format. Must be lowercase, hyphens allowed, no leading/trailing hyphens." },
      { status: 400 },
    );
  }
  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ error: `Slug "${slug}" is reserved` }, { status: 400 });
  }

  const existing = await prisma.channelCategory.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }

  const category = await prisma.channelCategory.create({
    data: { name, slug },
  });

  return NextResponse.json(category, { status: 201 });
}
