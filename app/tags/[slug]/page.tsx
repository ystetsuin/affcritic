import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Feed } from "@/components/Feed";
import { EntityHeader } from "@/components/EntityHeader";
import { DesktopSidebar } from "@/components/SidebarServer";
import { Footer } from "@/components/Footer";
import { TagFilterProvider } from "@/components/TagFilterContext";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ period?: string }>;
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

export default async function TagPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { period } = await searchParams;
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
    <TagFilterProvider>
      <div className="hidden lg:grid" style={{ gridTemplateColumns: "var(--sidebar-w) 1fr" }}>
        <Suspense>
          <DesktopSidebar />
        </Suspense>
        <main style={{ padding: "28px 32px 48px" }}>
          <EntityHeader
            tagName={tag.name}
            categoryName={tag.category.name}
            mentionsCount={tag._count.postTags}
          />
          <Suspense>
            <Feed tag={tag.slug} period={period} />
          </Suspense>
        </main>
      </div>

      <div className="lg:hidden">
        <main style={{ padding: "12px 16px" }}>
          <EntityHeader
            tagName={tag.name}
            categoryName={tag.category.name}
            mentionsCount={tag._count.postTags}
          />
          <Suspense>
            <Feed tag={tag.slug} period={period} />
          </Suspense>
        </main>
      </div>

      <Footer />
    </TagFilterProvider>
  );
}
