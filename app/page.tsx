import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Feed } from "@/components/Feed";
import { DesktopSidebar, MobileSidebarButton } from "@/components/SidebarServer";

async function HomeStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(todayStart.getTime() - 7 * 86400000);
  const monthAgo = new Date(todayStart.getTime() - 30 * 86400000);
  const [today, week, month, allTime] = await Promise.all([
    prisma.rawPost.count({ where: { postedAt: { gte: todayStart } } }),
    prisma.rawPost.count({ where: { postedAt: { gte: weekAgo } } }),
    prisma.rawPost.count({ where: { postedAt: { gte: monthAgo } } }),
    prisma.rawPost.count(),
  ]);
  return (
    <div className="mb-5 text-xs text-muted-foreground">
      Сьогодні: <b className="text-foreground">{today}</b>
      <span className="mx-1.5">·</span>
      Тиждень: <b className="text-foreground">{week}</b>
      <span className="mx-1.5">·</span>
      Місяць: <b className="text-foreground">{month}</b>
      <span className="mx-1.5">·</span>
      Всього: <b className="text-foreground">{allTime}</b>
    </div>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">AffCritic</h1>
          <p className="text-sm text-muted-foreground">Affiliate news digest</p>
        </div>
        <nav className="flex items-center gap-3">
          <Suspense>
            <MobileSidebarButton />
          </Suspense>
        </nav>
      </header>

      {/* Stats */}
      <Suspense>
        <HomeStats />
      </Suspense>

      {/* Main layout: feed + sidebar */}
      <div className="flex gap-8">
        <main className="min-w-0 flex-1">
          <Suspense fallback={<FeedSkeleton />}>
            <Feed />
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
          <div className="mt-3 flex gap-2">
            <div className="h-5 w-16 rounded bg-muted" />
            <div className="h-5 w-20 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
