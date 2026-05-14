export const dynamic = "force-dynamic";

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
      <div className="page-layout">
        <aside>
          <Suspense>
            <DesktopSidebar />
          </Suspense>
        </aside>

        <main>
          <Breadcrumbs items={[{ label: "AffCritic", href: "/" }, { label: "Всі новини" }]} />
          <h1 className="feed-title">AffCritic AI Summary Feed</h1>

          <div className="lg:hidden" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
            <Suspense>
              <MobileSidebarButton />
            </Suspense>
          </div>

          <Suspense fallback={<FeedSkeleton />}>
            <Feed period={period} />
          </Suspense>
        </main>
      </div>

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
