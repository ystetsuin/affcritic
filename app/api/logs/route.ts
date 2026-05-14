import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import type { Prisma } from "../../../generated/prisma/client";

const VALID_TYPES = new Set(["scraper", "embedding", "grouping", "gpt", "quality", "admin", "stats"]);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const type = searchParams.get("type");
  const postId = searchParams.get("post_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));
  const skip = (page - 1) * limit;

  const where: Prisma.PipelineLogWhereInput = {};

  if (type && VALID_TYPES.has(type)) {
    where.type = type as Prisma.EnumPipelineLogTypeFilter;
  }

  if (postId) {
    where.postId = postId;
  }

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    prisma.pipelineLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.pipelineLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
