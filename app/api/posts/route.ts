import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import type { Prisma } from "../../../generated/prisma/client";
import { periodToDate, parsePeriod } from "@/lib/period";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const folder = searchParams.get("folder");
  const channel = searchParams.get("channel");
  const tag = searchParams.get("tag");
  const tags = searchParams.get("tags"); // comma-separated slugs for multi-tag filter
  const period = parsePeriod(searchParams.get("period"));
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const skip = (page - 1) * limit;

  // Build AND conditions
  const andConditions: Prisma.PostWhereInput[] = [{ isDeleted: false, summary: { not: null } }];

  const since = periodToDate(period);
  if (since) {
    andConditions.push({ createdAt: { gte: since } });
  }

  if (folder) {
    andConditions.push({
      postSources: {
        some: {
          channel: {
            categoryMap: {
              some: { category: { slug: folder } },
            },
          },
        },
      },
    });
  }

  if (channel) {
    andConditions.push({
      postSources: {
        some: {
          channel: { username: channel },
        },
      },
    });
  }

  if (tag) {
    andConditions.push({
      postTags: {
        some: {
          tag: { slug: tag, status: "active" },
        },
      },
    });
  }

  if (tags) {
    const slugList = tags.split(",").map((s) => s.trim()).filter(Boolean);
    if (slugList.length > 0) {
      andConditions.push({
        postTags: {
          some: {
            tag: { slug: { in: slugList }, status: "active" },
          },
        },
      });
    }
  }

  const where: Prisma.PostWhereInput = { AND: andConditions };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        postSources: {
          include: {
            channel: {
              select: { username: true, displayName: true },
            },
          },
          orderBy: { id: "asc" },
        },
        postTags: {
          where: { tag: { status: "active" } },
          include: {
            tag: {
              select: {
                name: true,
                slug: true,
                category: {
                  select: { name: true, slug: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
