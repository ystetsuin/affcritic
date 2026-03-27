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
  params: Promise<{ username: string }>;
  searchParams: Promise<{ period?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
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
}

export default async function ChannelPage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const { period } = await searchParams;
  const channel = await prisma.channel.findUnique({
    where: { username },
    select: { username: true, displayName: true },
  });
  if (!channel) notFound();

  const displayName = channel.displayName || `@${channel.username}`;

  return (
    <TagFilterProvider>
      <div className="hidden lg:grid" style={{ gridTemplateColumns: "var(--sidebar-w) 1fr" }}>
        <Suspense>
          <DesktopSidebar />
        </Suspense>
        <main style={{ padding: "28px 32px 48px" }}>
          <Breadcrumbs items={[
            { label: "AffCritic", href: "/" },
            { label: "Канали", href: "/channels" },
            { label: displayName },
          ]} />
          <h1 className="feed-title">{displayName}</h1>
          {channel.displayName && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>@{channel.username}</p>
          )}
          <Suspense>
            <Feed channel={channel.username} period={period} />
          </Suspense>
        </main>
      </div>

      <div className="lg:hidden">
        <main style={{ padding: "12px 16px" }}>
          <Breadcrumbs items={[
            { label: "AffCritic", href: "/" },
            { label: "Канали", href: "/channels" },
            { label: displayName },
          ]} />
          <h1 className="feed-title" style={{ fontSize: 18 }}>{displayName}</h1>
          <Suspense>
            <Feed channel={channel.username} period={period} />
          </Suspense>
        </main>
      </div>

      <Footer />
    </TagFilterProvider>
  );
}
