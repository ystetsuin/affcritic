import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Feed } from "@/components/Feed";
import { DesktopSidebar, MobileSidebarButton } from "@/components/SidebarServer";
import { Footer } from "@/components/Footer";
import { TimeSwitcher } from "@/components/TimeSwitcher";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TagFilterProvider } from "@/components/TagFilterContext";
import { ActiveFilters } from "@/components/ActiveFilters";
import { periodToDate, parsePeriod } from "@/lib/period";

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

async function FeedCount({ period: raw }: { period?: string }) {
  const period = parsePeriod(raw);
  const since = periodToDate(period);
  const total = await prisma.post.count({
    where: {
      isDeleted: false,
      summary: { not: null },
      ...(since ? { createdAt: { gte: since } } : {}),
    },
  });
  return (
    <span className="feed-results">
      Знайдено постів: <span>{total}</span>
    </span>
  );
}

export default async function Home({ searchParams }: PageProps) {
  const { period } = await searchParams;

  return (
    <TagFilterProvider>
      {/* Desktop: Sidebar + Feed grid */}
      <div className="hidden lg:grid" style={{ gridTemplateColumns: "var(--sidebar-w) 1fr" }}>
        <Suspense>
          <DesktopSidebar />
        </Suspense>

        <main style={{ padding: "28px 32px 48px" }}>
          <Breadcrumbs items={[{ label: "AffCritic", href: "/" }, { label: "Всі новини" }]} />
          <h1 className="feed-title">AffCritic AI Summary Feed</h1>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div className="feed-meta">
              <Suspense fallback={<span className="feed-results">Завантаження...</span>}>
                <FeedCount period={period} />
              </Suspense>
              <ActiveFilters />
            </div>
            <Suspense>
              <TimeSwitcher />
            </Suspense>
          </div>

          <Suspense fallback={<FeedSkeleton />}>
            <Feed period={period} />
          </Suspense>
        </main>
      </div>

      {/* Mobile: single column */}
      <div className="lg:hidden">
        <div style={{ padding: "12px 16px 4px" }}>
          <Breadcrumbs items={[{ label: "AffCritic", href: "/" }, { label: "Всі новини" }]} />
          <h1 className="feed-title" style={{ fontSize: 18 }}>AffCritic AI Summary Feed</h1>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="feed-meta">
              <Suspense fallback={<span className="feed-results">...</span>}>
                <FeedCount period={period} />
              </Suspense>
              <ActiveFilters />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Suspense>
                <TimeSwitcher />
              </Suspense>
              <Suspense>
                <MobileSidebarButton />
              </Suspense>
            </div>
          </div>
        </div>

        <main style={{ padding: "12px" }}>
          <Suspense fallback={<FeedSkeleton />}>
            <Feed period={period} />
          </Suspense>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </TagFilterProvider>
  );
}

function FeedSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="post-card"
          style={{ opacity: 0.5 }}
        >
          <div style={{ height: 12, width: 80, background: "var(--surface-2)", borderRadius: 4, marginBottom: 12 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ height: 14, width: "100%", background: "var(--surface-2)", borderRadius: 4 }} />
            <div style={{ height: 14, width: "75%", background: "var(--surface-2)", borderRadius: 4 }} />
            <div style={{ height: 14, width: "50%", background: "var(--surface-2)", borderRadius: 4 }} />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
            <div style={{ height: 20, width: 60, background: "var(--surface-2)", borderRadius: 6 }} />
            <div style={{ height: 20, width: 72, background: "var(--surface-2)", borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
