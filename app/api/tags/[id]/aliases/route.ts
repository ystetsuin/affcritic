import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { logPipeline } from "../../../../../lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let body: { alias?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const alias = body.alias?.trim();
  if (!alias) return NextResponse.json({ error: "alias is required" }, { status: 400 });

  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });

  // 1. Alias cannot equal the tag's own name
  if (tag.name.toLowerCase() === alias.toLowerCase()) {
    return NextResponse.json({ error: "Alias не може дорівнювати назві тега" }, { status: 400 });
  }

  // 2. Alias cannot equal any other active tag's name
  const conflictTag = await prisma.tag.findFirst({
    where: { name: { equals: alias, mode: "insensitive" }, status: "active" },
  });
  if (conflictTag) {
    return NextResponse.json({ error: `Alias конфліктує з існуючим тегом "${conflictTag.name}"` }, { status: 409 });
  }

  // 3. Alias cannot equal any existing alias in DB
  const conflictAlias = await prisma.tagAlias.findFirst({
    where: { alias: { equals: alias, mode: "insensitive" } },
  });
  if (conflictAlias) {
    return NextResponse.json({ error: "Такий alias вже існує для іншого тега" }, { status: 409 });
  }

  const created = await prisma.tagAlias.create({
    data: { tagId: id, alias },
  });

  await logPipeline("admin", null, { action: "add_tag_alias", details: { tagId: id, alias } });

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const aliasId = request.nextUrl.searchParams.get("aliasId");

  if (!aliasId) return NextResponse.json({ error: "aliasId query param required" }, { status: 400 });

  const alias = await prisma.tagAlias.findUnique({ where: { id: aliasId } });
  if (!alias || alias.tagId !== id) {
    return NextResponse.json({ error: "Alias not found" }, { status: 404 });
  }

  await prisma.tagAlias.delete({ where: { id: aliasId } });

  await logPipeline("admin", null, { action: "delete_tag_alias", details: { tagId: id, aliasId, alias: alias.alias } });

  return NextResponse.json({ ok: true });
}
