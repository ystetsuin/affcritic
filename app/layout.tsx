import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
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
        {/* Critical CSS — prevents FOUC before Tailwind loads */}
        <style dangerouslySetInnerHTML={{ __html: `.hidden{display:none!important}@media(min-width:64rem){.lg\\:hidden{display:none!important}.lg\\:block{display:block!important}.lg\\:grid{display:grid!important}}` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
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

          {/* d-body: content wrapper */}
          <div className="d-body">
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
