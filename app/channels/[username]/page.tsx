import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Feed } from "@/components/Feed";
import { DesktopSidebar, MobileSidebarButton } from "@/components/SidebarServer";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ username: string }>;
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

export default async function ChannelPage({ params }: PageProps) {
  const { username } = await params;
  const channel = await prisma.channel.findUnique({
    where: { username },
    select: { username: true, displayName: true },
  });
  if (!channel) notFound();

  const displayName = channel.displayName || `@${channel.username}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/channels/" className="transition-colors hover:text-foreground">Channels</Link>
          <span>/</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">{displayName}</h1>
        {channel.displayName && (
          <p className="text-sm text-muted-foreground">@{channel.username}</p>
        )}
      </header>

      <div className="flex gap-8">
        <main className="min-w-0 flex-1">
          <Suspense fallback={<FeedSkeleton />}>
            <Feed channel={channel.username} />
          </Suspense>
        </main>
        <Suspense>
          <DesktopSidebar />
        </Suspense>
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
