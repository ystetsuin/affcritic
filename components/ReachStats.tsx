"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type PeriodKey = "7d" | "30d" | "all";

interface PeriodData {
  median: number;
  mean: number;
  posts: number;
}

interface ReachData {
  median: number;
  mean: number;
  er: number | null;
  periods: Record<PeriodKey, PeriodData>;
  histogram: { bucket: string; count: number }[];
  postsWithViews: number;
  totalPosts: number;
}

const PERIOD_LABELS: { key: PeriodKey; label: string }[] = [
  { key: "7d", label: "7д" },
  { key: "30d", label: "30д" },
  { key: "all", label: "Все" },
];

function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString("uk-UA");
}

export function ReachStats({ data }: { data: ReachData | null }) {
  const [period, setPeriod] = useState<PeriodKey>("30d");

  if (!data) {
    return (
      <div className="ch-stats" style={{ textAlign: "center", padding: "20px" }}>
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Дані про перегляди поки недоступні
        </span>
      </div>
    );
  }

  const p = data.periods[period];
  const erColor = data.er != null
    ? data.er >= 30 ? "var(--green)" : data.er >= 15 ? "var(--amber)" : "var(--red)"
    : "var(--text-muted)";

  const isSkewed = data.mean > data.median * 1.3;
  const coverage = data.totalPosts > 0 ? Math.round((data.postsWithViews / data.totalPosts) * 100) : 0;

  // Sort histogram by count desc for display
  const sortedHist = [...data.histogram].filter((h) => h.count > 0).sort((a, b) => b.count - a.count);

  return (
    <div className="ch-stats">
      <div className="reach-header">
        <h3 className="ch-stats-heading" style={{ margin: 0 }}>Охоплення</h3>
        <div className="growth-switcher">
          {PERIOD_LABELS.map((pl) => (
            <button
              key={pl.key}
              className={`growth-pill ${period === pl.key ? "active" : ""}`}
              onClick={() => setPeriod(pl.key)}
            >
              {pl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main metrics */}
      <div className="reach-metrics">
        <div className="reach-main">
          <span className="reach-main-value">~{formatViews(p.median)}</span>
          <span className="reach-main-label">переглядів/пост</span>
        </div>

        <div className="reach-pills">
          {data.er != null && (
            <div className="reach-pill">
              <span className="reach-pill-value" style={{ color: erColor }}>ER {data.er}%</span>
            </div>
          )}
          <div className="reach-pill">
            <span className="reach-pill-label">Середнє</span>
            <span className="reach-pill-value">{formatViews(p.mean)}</span>
          </div>
          <div className="reach-pill">
            <span className="reach-pill-label">Постів</span>
            <span className="reach-pill-value">{p.posts}</span>
          </div>
        </div>
      </div>

      {isSkewed && (
        <p className="reach-note">Середнє значно вище медіани — є вірусні пости</p>
      )}

      {coverage < 50 && coverage > 0 && (
        <p className="reach-note">Дані по {coverage}% постів</p>
      )}

      {/* Histogram */}
      {sortedHist.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <span className="reach-hist-label">Розподіл переглядів</span>
          <ResponsiveContainer width="100%" height={sortedHist.length * 32 + 8}>
            <BarChart
              data={sortedHist}
              layout="vertical"
              margin={{ top: 4, right: 40, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="bucket"
                tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
                width={60}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--text)",
                }}
                formatter={(value) => [value, "Постів"]}
                labelFormatter={(label) => `${label} переглядів`}
              />
              <Bar
                dataKey="count"
                fill="var(--accent)"
                fillOpacity={0.7}
                radius={[0, 3, 3, 0]}
                label={{
                  position: "right",
                  fill: "var(--text-muted)",
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
