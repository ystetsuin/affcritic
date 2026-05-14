export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Feed } from "@/components/Feed";
import { DesktopSidebar } from "@/components/SidebarServer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { TagFilterProvider } from "@/components/TagFilterContext";
import { ChannelStatsCard } from "@/components/ChannelStatsCard";
import { ChannelHero } from "@/components/ChannelHero";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ period?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { username } = await params;
    const channel = await prisma.channel.findUnique({
      where: { username },
      select: { username: true, displayName: true },
    });
    if (!channel) return {};
    const name = channel.displayName || `@${channel.username}`;
    return {
      title: `${name} — AffCritic`,
      description: `Posts from ${name}`,
    };
  } catch {
    return {};
  }
}

export default async function ChannelPage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const { period } = await searchParams;
  let channel;
  try {
    channel = await prisma.channel.findUnique({
      where: { username },
      select: {
        username: true,
        displayName: true,
        avatarUrl: true,
        description: true,
        categoryMap: {
          include: { category: { select: { name: true, slug: true } } },
        },
      },
    });
  } catch {
    notFound();
  }
  if (!channel) notFound();

  const displayName = channel.displayName || `@${channel.username}`;
  const categories = channel.categoryMap.map((m) => m.category);

  return (
    <TagFilterProvider>
      <div className="page-layout">
        <aside>
          <Suspense>
            <DesktopSidebar />
          </Suspense>
        </aside>
        <main>
          <Breadcrumbs items={[
            { label: "AffCritic", href: "/" },
            { label: "Канали", href: "/channels" },
            { label: displayName },
          ]} />
          <ChannelHero
            username={channel.username}
            displayName={channel.displayName}
            avatarUrl={channel.avatarUrl}
            description={channel.description}
            categories={categories}
          />
          <ChannelStatsCard username={channel.username} />
          <Suspense>
            <Feed channel={channel.username} period={period} />
          </Suspense>
        </main>
      </div>

      <Footer />
    </TagFilterProvider>
  );
}
