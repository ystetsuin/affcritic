import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { logPipeline } from "../../../../../lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });

  if (tag.status === "active") {
    return NextResponse.json({ error: "Tag is already active" }, { status: 400 });
  }

  const updated = await prisma.tag.update({
    where: { id },
    data: { status: "active" },
  });

  await logPipeline("admin", null, { action: "approve_tag", details: { id, name: tag.name } });

  return NextResponse.json(updated);
}
