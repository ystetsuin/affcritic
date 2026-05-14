"use client";

import { useEffect, useState } from "react";
import { PostingHeatmap } from "./PostingHeatmap";
import { TopTagsBar } from "./TopTagsBar";
import { SubscriberStats } from "./SubscriberStats";
import { SubscriberGrowthChart } from "./SubscriberGrowthChart";
import { ReachStats } from "./ReachStats";
import { TopPosts } from "./TopPosts";

interface ReachData {
  median: number;
  mean: number;
  er: number | null;
  periods: Record<string, { median: number; mean: number; posts: number }>;
  histogram: { bucket: string; count: number }[];
  postsWithViews: number;
  totalPosts: number;
}

interface SubscriberData {
  current: number;
  deltaToday: number;
  deltaWeek: number;
  deltaMonth: number;
  history: { date: string; count: number }[];
  deltas: { date: string; delta: number }[];
  avgDeltaPerDay: number;
}

interface ChannelStats {
  totalRawPosts: number;
  totalInFeed: number;
  dedupRatio: number;
  avgSummaryScore: number | null;
  topTags: { name: string; slug: string; count: number }[];
  heatmap: { day: number; hour: number; count: number }[];
  activityByWeek: { week: string; count: number }[];
  subscribers: SubscriberData | null;
  reach: ReachData | null;
}

export function ChannelStatsCard({ username }: { username: string }) {
  const [stats, setStats] = useState<ChannelStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/channel-stats/${username}`)
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <StatsCardSkeleton />;
  if (!stats) return null;

  const scoreClass =
    stats.avgSummaryScore != null
      ? stats.avgSummaryScore >= 0.75
        ? "score-green"
        : stats.avgSummaryScore >= 0.6
          ? "score-amber"
          : "score-red"
      : "";

  return (
    <>
    <SubscriberStats data={stats.subscribers} />
    {stats.subscribers && stats.subscribers.deltas.length > 0 && (
      <SubscriberGrowthChart
        deltas={stats.subscribers.deltas}
        avgDeltaPerDay={stats.subscribers.avgDeltaPerDay}
      />
    )}
    <ReachStats data={stats.reach} />
    <TopPosts username={username} />
    <div className="ch-stats">
      {/* Metrics grid */}
      <div className="ch-stats-grid">
        <div className="ch-stat-tile">
          <span className="ch-stat-value">{stats.totalRawPosts}</span>
          <span className="ch-stat-label">Raw постів</span>
        </div>
        <div className="ch-stat-tile">
          <span className="ch-stat-value">{stats.totalInFeed}</span>
          <span className="ch-stat-label">У стрічці</span>
        </div>
        <div className="ch-stat-tile">
          <span className="ch-stat-value">{Math.round(stats.dedupRatio * 100)}%</span>
          <span className="ch-stat-label">Унікальність</span>
        </div>
        <div className="ch-stat-tile">
          <span className={`ch-stat-value ${scoreClass}`}>
            {stats.avgSummaryScore != null ? stats.avgSummaryScore.toFixed(2) : "—"}
          </span>
          <span className="ch-stat-label">Якість</span>
        </div>
      </div>

      {/* Heatmap */}
      {stats.heatmap.length > 0 && (
        <div className="ch-stats-section">
          <h3 className="ch-stats-heading">Активність постингу</h3>
          <PostingHeatmap data={stats.heatmap} />
        </div>
      )}

      {/* Top tags */}
      {stats.topTags.length > 0 && (
        <div className="ch-stats-section">
          <h3 className="ch-stats-heading">Топ теги</h3>
          <TopTagsBar tags={stats.topTags} />
        </div>
      )}
    </div>
    </>
  );
}

function StatsCardSkeleton() {
  return (
    <div className="ch-stats">
      <div className="ch-stats-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="ch-stat-tile" style={{ opacity: 0.5 }}>
            <div style={{ height: 24, width: 48, background: "var(--surface-2)", borderRadius: 4 }} />
            <div style={{ height: 12, width: 64, background: "var(--surface-2)", borderRadius: 4, marginTop: 6 }} />
          </div>
        ))}
      </div>
      <div style={{ height: 140, background: "var(--surface-2)", borderRadius: 6, marginTop: 16, opacity: 0.4 }} />
    </div>
  );
}
