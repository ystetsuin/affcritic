"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar, SidebarDrawer } from "./Sidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { Footer } from "./Footer";

interface Category {
  id: string;
  name: string;
  slug: string;
  channelCount: number;
}

interface ChannelStats {
  today: number;
  week: number;
  month: number;
  allTime: number;
}

interface ChannelData {
  id: string;
  username: string;
  displayName: string | null;
  isActive: boolean;
  categories: { id: string; name: string; slug: string }[];
  stats: ChannelStats;
  share: ChannelStats;
}

interface Totals {
  today: number;
  week: number;
  month: number;
  allTime: number;
}

interface ChannelsPageProps {
  channels: ChannelData[];
  categories: Category[];
  totals: Totals;
}

type StatsMode = "count" | "share";

function formatStat(count: number, share: number, mode: StatsMode) {
  if (count === 0) return mode === "share" ? "0%" : "0";
  if (mode === "share") return `${Math.round(share * 100)}%`;
  return String(count);
}

export function ChannelsPage({ channels, categories, totals }: ChannelsPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [statsMode, setStatsMode] = useState<StatsMode>("count");

  const filtered = selectedCategory
    ? channels.filter((ch) => ch.categories.some((c) => c.slug === selectedCategory))
    : channels;

  const sorted = [...filtered].sort((a, b) => b.share.allTime - a.share.allTime);

  return (
    <>
      {/* Desktop: sidebar + content */}
      <div className="hidden lg:grid" style={{ gridTemplateColumns: "var(--sidebar-w) 1fr" }}>
        <aside className="d-sidebar">
          <Sidebar
            groups={[]}
            mode="channels"
            channelCategories={categories}
            activeCategorySlug={selectedCategory}
            onCategorySelect={setSelectedCategory}
          />
        </aside>

        <main style={{ padding: "28px 32px 48px" }}>
          <Breadcrumbs items={[{ label: "AffCritic", href: "/" }, { label: "Канали" }]} />
          <h1 className="feed-title">Канали</h1>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span className="feed-results">
              <span>{channels.length}</span> каналів
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Сьогодні: <b style={{ color: "var(--text-secondary)" }}>{totals.today}</b>
                {" · "}Тиждень: <b style={{ color: "var(--text-secondary)" }}>{totals.week}</b>
                {" · "}Місяць: <b style={{ color: "var(--text-secondary)" }}>{totals.month}</b>
                {" · "}Всього: <b style={{ color: "var(--text-secondary)" }}>{totals.allTime}</b>
              </span>
              <div className="time-switcher">
                {(["count", "share"] as const).map((mode) => (
                  <button
                    key={mode}
                    className={`ts-btn ${statsMode === mode ? "active" : ""}`}
                    onClick={() => setStatsMode(mode)}
                  >
                    {mode === "count" ? "#" : "%"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ChannelTable channels={sorted} statsMode={statsMode} />
        </main>
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        <main style={{ padding: "12px 16px" }}>
          <Breadcrumbs items={[{ label: "AffCritic", href: "/" }, { label: "Канали" }]} />
          <h1 className="feed-title" style={{ fontSize: 18 }}>Канали</h1>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="feed-results"><span>{channels.length}</span> каналів</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="time-switcher">
                {(["count", "share"] as const).map((mode) => (
                  <button
                    key={mode}
                    className={`ts-btn ${statsMode === mode ? "active" : ""}`}
                    onClick={() => setStatsMode(mode)}
                  >
                    {mode === "count" ? "#" : "%"}
                  </button>
                ))}
              </div>
              <SidebarDrawer
                groups={[]}
                mode="channels"
                channelCategories={categories}
                activeCategorySlug={selectedCategory}
                onCategorySelect={setSelectedCategory}
              />
            </div>
          </div>

          <ChannelTable channels={sorted} statsMode={statsMode} />
        </main>
      </div>

      <Footer />
    </>
  );
}

function ChannelTable({ channels, statsMode }: { channels: ChannelData[]; statsMode: StatsMode }) {
  if (channels.length === 0) {
    return (
      <p style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 13 }}>
        Немає каналів
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th style={{ textAlign: "left", padding: "8px 12px 8px 0", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
              Канал
            </th>
            <th style={{ textAlign: "right", padding: "8px 12px 8px 0", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
              День
            </th>
            <th style={{ textAlign: "right", padding: "8px 12px 8px 0", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
              Тиждень
            </th>
            <th style={{ textAlign: "right", padding: "8px 12px 8px 0", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
              Місяць
            </th>
            <th style={{ textAlign: "right", padding: "8px 0", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
              Всього
            </th>
          </tr>
        </thead>
        <tbody>
          {channels.map((ch) => (
            <tr key={ch.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "10px 12px 10px 0" }}>
                <Link
                  href={`/channels/${ch.username}/`}
                  style={{ color: "var(--text)", textDecoration: "none", fontWeight: 500 }}
                >
                  @{ch.username}
                </Link>
                {ch.displayName && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-muted)" }}>{ch.displayName}</span>
                )}
                {!ch.isActive && (
                  <span className="score-badge score-red" style={{ marginLeft: 6 }}>off</span>
                )}
                {ch.categories.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {ch.categories.map((c) => (
                      <span key={c.id} className="tag-chip" style={{ fontSize: 10, padding: "1px 6px" }}>
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td style={{ textAlign: "right", padding: "10px 12px 10px 0", fontVariantNumeric: "tabular-nums", color: "var(--text-secondary)" }}>
                {formatStat(ch.stats.today, ch.share.today, statsMode)}
              </td>
              <td style={{ textAlign: "right", padding: "10px 12px 10px 0", fontVariantNumeric: "tabular-nums", color: "var(--text-secondary)" }}>
                {formatStat(ch.stats.week, ch.share.week, statsMode)}
              </td>
              <td style={{ textAlign: "right", padding: "10px 12px 10px 0", fontVariantNumeric: "tabular-nums", color: "var(--text-secondary)" }}>
                {formatStat(ch.stats.month, ch.share.month, statsMode)}
              </td>
              <td style={{ textAlign: "right", padding: "10px 0", fontVariantNumeric: "tabular-nums", fontWeight: 500, color: "var(--text)" }}>
                {formatStat(ch.stats.allTime, ch.share.allTime, statsMode)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
