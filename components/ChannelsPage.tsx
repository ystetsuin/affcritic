"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sidebar, SidebarDrawer } from "./Sidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { Footer } from "./Footer";
import { Sparkline } from "./Sparkline";

interface Category {
  id: string;
  name: string;
  slug: string;
  channelCount: number;
}

interface ChannelData {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  description: string | null;
  isActive: boolean;
  categories: { id: string; name: string; slug: string }[];
  subscribers: number | null;
  subscribersDelta7d: number | null;
  postsInFeed: number;
  dedupRatio: number;
  topTags: { name: string; slug: string }[];
  sparkline: number[];
}

interface ChannelsPageProps {
  channels: ChannelData[];
  categories: Category[];
}

type SortKey = "subscribers" | "activity" | "uniq";

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 10_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString("uk-UA");
}

export function ChannelsPage({ channels, categories }: ChannelsPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("subscribers");

  const filtered = selectedCategory
    ? channels.filter((ch) => ch.categories.some((c) => c.slug === selectedCategory))
    : channels;

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "subscribers") return (b.subscribers ?? -1) - (a.subscribers ?? -1);
    if (sortKey === "activity") return b.sparkline.reduce((s, v) => s + v, 0) - a.sparkline.reduce((s, v) => s + v, 0);
    return b.dedupRatio - a.dedupRatio;
  });

  const content = (
    <>
      <Breadcrumbs items={[{ label: "AffCritic", href: "/" }, { label: "Канали" }]} />
      <div className="ch-catalog-header">
        <h1 className="feed-title">Канали <span style={{ fontWeight: 400, fontSize: 14, color: "var(--text-muted)" }}>{channels.length}</span></h1>
        <div className="ch-catalog-controls">
          <div className="growth-switcher">
            {([["subscribers", "Підписники"], ["activity", "Активність"], ["uniq", "Унікальність"]] as const).map(([key, label]) => (
              <button
                key={key}
                className={`growth-pill ${sortKey === key ? "active" : ""}`}
                onClick={() => setSortKey(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="lg:hidden">
            <SidebarDrawer
              groups={[]}
              mode="channels"
              channelCategories={categories}
              activeCategorySlug={selectedCategory}
              onCategorySelect={setSelectedCategory}
            />
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 13 }}>
          Немає каналів
        </p>
      ) : (
        <div className="ch-card-list">
          {sorted.map((ch) => (
            <ChannelCard key={ch.username} channel={ch} />
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="page-layout">
        <aside>
          <Sidebar
            groups={[]}
            mode="channels"
            channelCategories={categories}
            activeCategorySlug={selectedCategory}
            onCategorySelect={setSelectedCategory}
          />
        </aside>
        <main>
          {content}
        </main>
      </div>
      <Footer />
    </>
  );
}

function ChannelCard({ channel: ch }: { channel: ChannelData }) {
  const name = ch.displayName || `@${ch.username}`;
  const initial = (ch.displayName || ch.username).charAt(0).toUpperCase();
  const uniqPct = Math.round(ch.dedupRatio * 100);
  const uniqColor = uniqPct >= 70 ? "var(--green)" : uniqPct >= 50 ? "var(--amber)" : "var(--red)";

  return (
    <div className={`ch-card ${!ch.isActive ? "ch-card-inactive" : ""}`}>
      <Link href={`/channels/${ch.username}/`} className="ch-card-main">
        {/* Avatar */}
        {ch.avatarUrl ? (
          <Image src={ch.avatarUrl} alt={name} width={48} height={48} className="ch-card-avatar" />
        ) : (
          <div className="ch-card-avatar ch-card-avatar-ph">{initial}</div>
        )}

        {/* Name + bio */}
        <div className="ch-card-info">
          <div className="ch-card-name">
            {name}
            {!ch.isActive && <span className="ch-card-badge-off">Неактивний</span>}
          </div>
          {ch.description && <p className="ch-card-bio">{ch.description}</p>}
        </div>

        {/* Subscribers */}
        <div className="ch-card-metric ch-card-subs">
          {ch.subscribers != null ? (
            <>
              <span className="ch-card-metric-val">{formatCompact(ch.subscribers)}</span>
              {ch.subscribersDelta7d != null && ch.subscribersDelta7d !== 0 && (
                <span className={`ch-card-delta ${ch.subscribersDelta7d > 0 ? "delta-positive" : "delta-negative"}`}>
                  {ch.subscribersDelta7d > 0 ? "+" : ""}{formatCompact(ch.subscribersDelta7d)}
                </span>
              )}
            </>
          ) : (
            <span className="ch-card-metric-val" style={{ color: "var(--text-muted)" }}>—</span>
          )}
          <span className="ch-card-metric-label">підп.</span>
        </div>

        {/* Posts in feed */}
        <div className="ch-card-metric ch-card-posts">
          <span className="ch-card-metric-val">{ch.postsInFeed}</span>
          <span className="ch-card-metric-label">постів</span>
        </div>

        {/* Uniq */}
        <div className="ch-card-metric ch-card-uniq">
          <span className="ch-card-metric-val" style={{ color: uniqColor }}>{uniqPct}%</span>
          <span className="ch-card-metric-label">унік.</span>
        </div>

        {/* Sparkline */}
        <div className="ch-card-spark">
          <Sparkline data={ch.sparkline} width={120} height={32} />
        </div>
      </Link>

      {/* Tags — outside Link to allow separate clicks */}
      {ch.topTags.length > 0 && (
        <div className="ch-card-tags">
          {ch.topTags.map((t) => (
            <Link key={t.slug} href={`/tags/${t.slug}/`} className="tag-chip" style={{ fontSize: 10, padding: "1px 6px" }}>
              {t.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
