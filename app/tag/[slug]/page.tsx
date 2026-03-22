import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Feed } from "@/components/Feed";
import { EntityHeader } from "@/components/EntityHeader";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const tag = await prisma.tag.findUnique({
    where: { slug },
    select: { name: true, status: true },
  });

  if (!tag || tag.status !== "active") return {};

  return {
    title: `${tag.name} — AffCritic`,
    description: `Posts tagged with ${tag.name}`,
  };
}

export default async function TagPage({ params }: PageProps) {
  const { slug } = await params;

  const tag = await prisma.tag.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      status: true,
      category: { select: { name: true } },
      _count: { select: { postTags: true } },
    },
  });

  if (!tag || tag.status !== "active") notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <EntityHeader
        tagName={tag.name}
        categoryName={tag.category.name}
        mentionsCount={tag._count.postTags}
      />

      <div className="flex gap-8">
        <main className="min-w-0 flex-1">
          <Suspense fallback={<FeedSkeleton />}>
            <Feed tag={tag.slug} />
          </Suspense>
        </main>

        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            Sidebar placeholder
          </div>
        </aside>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse border-b border-border pb-5">
          <div className="mb-2 h-3 w-32 rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
