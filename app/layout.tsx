import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { LeftNav } from "@/components/LeftNav";
import { BottomNav } from "@/components/BottomNav";
import { Topbar } from "@/components/Topbar";
import { MobileHeader } from "@/components/MobileHeader";
import { AdminWrapper } from "@/components/AdminWrapper";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "AffCritic — Affiliate News Digest",
  description: "Aggregated news from affiliate marketing Telegram channels",
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');var l=t==='light'||(t!=='dark'&&window.matchMedia('(prefers-color-scheme: light)').matches);if(l)document.documentElement.classList.add('light')}catch(e){}})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          {/* Desktop: Topbar */}
          <div className="hidden lg:block">
            <Topbar />
          </div>

          {/* Mobile: Header */}
          <div className="lg:hidden">
            <MobileHeader />
          </div>

          {/* d-body: Nav + d-content */}
          <div className="d-body">
            {/* Desktop: Left Nav (72px spacer + fixed inner) */}
            <div className="hidden lg:block">
              <LeftNav />
            </div>

            {/* d-content: sidebar + feed (grid set per-page) */}
            <div className="d-content">
              <Suspense>
                <AdminWrapper>
                  {children}
                </AdminWrapper>
              </Suspense>
            </div>
          </div>

          {/* Mobile: Bottom Nav */}
          <div className="lg:hidden">
            <BottomNav />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
