import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let body: { name?: string; slug?: string; sortOrder?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.tagCategory.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: { name?: string; slug?: string; sortOrder?: number } = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    data.name = name;
  }
  if (body.slug !== undefined) {
    const slug = body.slug.trim().toLowerCase();
    if (!SLUG_RE.test(slug)) return NextResponse.json({ error: "Invalid slug format" }, { status: 400 });
    const conflict = await prisma.tagCategory.findUnique({ where: { slug } });
    if (conflict && conflict.id !== id) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    data.slug = slug;
  }
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  const category = await prisma.tagCategory.update({ where: { id }, data });
  return NextResponse.json(category);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const existing = await prisma.tagCategory.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cascade: tags onDelete: Cascade in Prisma schema
  await prisma.tagCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
