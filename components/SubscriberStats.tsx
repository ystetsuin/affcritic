"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SubscriberData {
  current: number;
  deltaToday: number;
  deltaWeek: number;
  deltaMonth: number;
  history: { date: string; count: number }[];
}

function formatNumber(n: number): string {
  return n.toLocaleString("uk-UA");
}

function DeltaBadge({ value, label }: { value: number; label: string }) {
  const cls =
    value > 0 ? "delta-positive" : value < 0 ? "delta-negative" : "delta-zero";
  const sign = value > 0 ? "+" : "";
  return (
    <div className="sub-delta">
      <span className={`sub-delta-value ${cls}`}>
        {sign}{formatNumber(value)}
      </span>
      <span className="sub-delta-label">{label}</span>
    </div>
  );
}

export function SubscriberStats({ data }: { data: SubscriberData | null }) {
  if (!data) {
    return (
      <div className="ch-stats" style={{ textAlign: "center", padding: "24px 20px" }}>
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Дані про підписників поки недоступні
        </span>
      </div>
    );
  }

  return (
    <div className="ch-stats sub-stats">
      <div className="sub-header">
        <div>
          <span className="sub-current">{formatNumber(data.current)}</span>
          <span className="sub-label">підписників</span>
        </div>
        <div className="sub-deltas">
          <DeltaBadge value={data.deltaToday} label="сьогодні" />
          <DeltaBadge value={data.deltaWeek} label="тиждень" />
          <DeltaBadge value={data.deltaMonth} label="місяць" />
        </div>
      </div>

      {data.history.length > 1 && (
        <div className="sub-chart">
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={data.history} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                tickFormatter={(d: string) => d.slice(5)}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={["dataMin - 100", "dataMax + 100"]} />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--text)",
                }}
                labelFormatter={(d) => String(d)}
                formatter={(value) => [formatNumber(Number(value)), "Підписники"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#subGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
