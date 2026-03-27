import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Feed } from "@/components/Feed";
import { DesktopSidebar } from "@/components/SidebarServer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { TagFilterProvider } from "@/components/TagFilterContext";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ period?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.channelCategory.findUnique({
    where: { slug },
    select: { name: true },
  });
  if (!category) return {};
  return {
    title: `${category.name} — AffCritic`,
    description: `Affiliate news from ${category.name} channels`,
  };
}

export default async function TopicPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { period } = await searchParams;
  const category = await prisma.channelCategory.findUnique({
    where: { slug },
    select: { name: true, slug: true },
  });
  if (!category) notFound();

  return (
    <TagFilterProvider>
      <div className="hidden lg:grid" style={{ gridTemplateColumns: "var(--sidebar-w) 1fr" }}>
        <Suspense>
          <DesktopSidebar />
        </Suspense>
        <main style={{ padding: "28px 32px 48px" }}>
          <Breadcrumbs items={[
            { label: "AffCritic", href: "/" },
            { label: "Тематики", href: "/topics" },
            { label: category.name },
          ]} />
          <h1 className="feed-title">{category.name}</h1>
          <Suspense>
            <Feed folder={category.slug} period={period} />
          </Suspense>
        </main>
      </div>

      <div className="lg:hidden">
        <main style={{ padding: "12px 16px" }}>
          <Breadcrumbs items={[
            { label: "AffCritic", href: "/" },
            { label: "Тематики", href: "/topics" },
            { label: category.name },
          ]} />
          <h1 className="feed-title" style={{ fontSize: 18 }}>{category.name}</h1>
          <Suspense>
            <Feed folder={category.slug} period={period} />
          </Suspense>
        </main>
      </div>

      <Footer />
    </TagFilterProvider>
  );
}
