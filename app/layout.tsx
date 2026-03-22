import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { FolderNavServer } from "@/components/FolderNavServer";
import { AdminWrapper } from "@/components/AdminWrapper";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "AffCritic — Affiliate News Digest",
  description: "Aggregated news from affiliate marketing Telegram channels",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={cn("font-sans", geist.variable)}>
      <body className={inter.className}>
        <div className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-2 sm:px-6 lg:px-8">
            <Suspense>
              <FolderNavServer />
            </Suspense>
          </div>
        </div>
        <Suspense>
          <AdminWrapper>
            {children}
          </AdminWrapper>
        </Suspense>
      </body>
    </html>
  );
}
