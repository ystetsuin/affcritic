"use client";

import { useCallback, useEffect, useState } from "react";

type Metric = "views" | "forwards" | "replies";
type Period = "7d" | "30d" | "all";

interface TopPost {
  rank: number;
  messageId: number;
  tgUrl: string;
  text: string | null;
  summary: string | null;
  views: number | null;
  forwards: number | null;
  replies: number | null;
  postedAt: string | null;
  isViral: boolean;
}

interface TopPostsData {
  metric: string;
  period: string;
  medianViews: number;
  posts: TopPost[];
}

const METRICS: { key: Metric; label: string; icon: string }[] = [
  { key: "views", label: "Перегляди", icon: "👁" },
  { key: "forwards", label: "Пересилки", icon: "🔄" },
  { key: "replies", label: "Коментарі", icon: "💬" },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: "7d", label: "7д" },
  { key: "30d", label: "30д" },
  { key: "all", label: "Все" },
];

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function formatDate(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
}

export function TopPosts({ username }: { username: string }) {
  const [metric, setMetric] = useState<Metric>("views");
  const [period, setPeriod] = useState<Period>("all");
  const [data, setData] = useState<TopPostsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/channel-top-posts/${username}?metric=${metric}&period=${period}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Failed to fetch top posts:", err);
    }
    setLoading(false);
  }, [username, metric, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const metricIcon = METRICS.find((m) => m.key === metric)?.icon ?? "";

  return (
    <div className="ch-stats">
      <div className="top-posts-header">
        <h3 className="ch-stats-heading" style={{ margin: 0 }}>Топ публікації</h3>
        <div className="top-posts-controls">
          <div className="growth-switcher">
            {METRICS.map((m) => (
              <button
                key={m.key}
                className={`growth-pill ${metric === m.key ? "active" : ""}`}
                onClick={() => setMetric(m.key)}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
          <div className="growth-switcher">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                className={`growth-pill ${period === p.key ? "active" : ""}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="top-posts-list">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="top-post-row" style={{ opacity: 0.4 }}>
              <span className="top-post-rank">#{i + 1}</span>
              <div style={{ height: 12, flex: 1, background: "var(--surface-2)", borderRadius: 4 }} />
            </div>
          ))
        ) : !data || data.posts.length === 0 ? (
          <p style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: 13 }}>
            Недостатньо даних
          </p>
        ) : (
          data.posts.map((post) => {
            const metricVal = post[metric] ?? 0;
            const displayText = post.summary || post.text || "—";
            return (
              <a
                key={post.messageId}
                href={post.tgUrl}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className={`top-post-row ${post.rank === 1 ? "top-post-first" : ""}`}
              >
                <span className="top-post-rank">#{post.rank}</span>
                <span className="top-post-metric">
                  {formatCompact(metricVal)} {metricIcon}
                </span>
                <span className="top-post-text">{displayText}</span>
                <span className="top-post-meta">
                  {post.postedAt && formatDate(post.postedAt)}
                  {post.isViral && " 🔥"}
                </span>
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}
