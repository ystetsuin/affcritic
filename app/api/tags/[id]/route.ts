import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { logPipeline } from "../../../../lib/logger";

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let body: { name?: string; slug?: string; categoryId?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Tag not found" }, { status: 404 });

  const data: { name?: string; slug?: string; categoryId?: string; status?: "active" | "pending" } = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    data.name = name;
  }
  if (body.slug !== undefined) {
    const slug = body.slug.trim().toLowerCase();
    if (!SLUG_RE.test(slug)) return NextResponse.json({ error: "Invalid slug format" }, { status: 400 });
    const conflict = await prisma.tag.findUnique({ where: { slug } });
    if (conflict && conflict.id !== id) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    data.slug = slug;
  }
  if (body.categoryId !== undefined) {
    const cat = await prisma.tagCategory.findUnique({ where: { id: body.categoryId } });
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    data.categoryId = body.categoryId;
  }
  if (body.status !== undefined) {
    if (body.status !== "active" && body.status !== "pending") {
      return NextResponse.json({ error: "status must be active or pending" }, { status: 400 });
    }
    data.status = body.status;
  }

  const tag = await prisma.tag.update({ where: { id }, data });

  await logPipeline("admin", null, { action: "update_tag", details: { id, changes: data } });

  return NextResponse.json(tag);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Tag not found" }, { status: 404 });

  // Cascade: PostTag onDelete: Cascade in Prisma schema
  await prisma.tag.delete({ where: { id } });

  await logPipeline("admin", null, { action: "delete_tag", details: { id, name: existing.name } });

  return NextResponse.json({ ok: true });
}
