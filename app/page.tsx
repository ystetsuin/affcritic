import { Suspense } from "react";
import { Feed } from "@/components/Feed";
import { DesktopSidebar, MobileSidebarButton } from "@/components/SidebarServer";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TagFilterProvider } from "@/components/TagFilterContext";

interface PageProps {
  searchParams: Promise<{ period?: string }>;
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

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
            <Suspense>
              <MobileSidebarButton />
            </Suspense>
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
