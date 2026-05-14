"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Period = "week" | "month" | "all";

interface DeltaEntry {
  date: string;
  delta: number;
}

interface Props {
  deltas: DeltaEntry[];
  avgDeltaPerDay: number;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "Тиждень" },
  { key: "month", label: "Місяць" },
  { key: "all", label: "Весь час" },
];

function formatDate(d: string) {
  return d.slice(8, 10) + "." + d.slice(5, 7);
}

function isoWeekLabel(d: string): string {
  const date = new Date(d + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `W${weekNo}`;
}

export function SubscriberGrowthChart({ deltas, avgDeltaPerDay }: Props) {
  const [period, setPeriod] = useState<Period>("month");

  const { chartData, avgLine, avgLabel } = useMemo(() => {
    if (deltas.length === 0) return { chartData: [], avgLine: 0, avgLabel: "" };

    // Sort ascending
    const sorted = [...deltas].sort((a, b) => a.date.localeCompare(b.date));

    if (period === "week") {
      const sliced = sorted.slice(-7);
      return {
        chartData: sliced.map((d) => ({ label: formatDate(d.date), delta: d.delta })),
        avgLine: avgDeltaPerDay,
        avgLabel: `Сер. ${avgDeltaPerDay >= 0 ? "+" : ""}${avgDeltaPerDay}/день`,
      };
    }

    if (period === "month") {
      const sliced = sorted.slice(-30);
      return {
        chartData: sliced.map((d) => ({ label: formatDate(d.date), delta: d.delta })),
        avgLine: avgDeltaPerDay,
        avgLabel: `Сер. ${avgDeltaPerDay >= 0 ? "+" : ""}${avgDeltaPerDay}/день`,
      };
    }

    // "all" — aggregate by ISO week
    const weekMap = new Map<string, number>();
    const weekDates = new Map<string, string>();
    for (const d of sorted) {
      const wk = isoWeekLabel(d.date);
      weekMap.set(wk, (weekMap.get(wk) ?? 0) + d.delta);
      if (!weekDates.has(wk)) weekDates.set(wk, d.date);
    }
    const weekData = Array.from(weekMap.entries()).map(([wk, delta]) => ({
      label: wk,
      delta,
    }));
    const avgPerWeek =
      weekData.length > 0
        ? parseFloat((weekData.reduce((s, d) => s + d.delta, 0) / weekData.length).toFixed(1))
        : 0;
    return {
      chartData: weekData,
      avgLine: avgPerWeek,
      avgLabel: `Сер. ${avgPerWeek >= 0 ? "+" : ""}${avgPerWeek}/тижд.`,
    };
  }, [deltas, avgDeltaPerDay, period]);

  if (deltas.length === 0) {
    return (
      <div className="ch-stats" style={{ textAlign: "center", padding: "20px" }}>
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Недостатньо даних для графіку
        </span>
      </div>
    );
  }

  return (
    <div className="ch-stats">
      {/* Period switcher */}
      <div className="growth-header">
        <h3 className="ch-stats-heading" style={{ margin: 0 }}>Динаміка підписників</h3>
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

      {/* Chart */}
      <div style={{ marginTop: 16 }}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              axisLine={false}
              tickLine={false}
              interval={period === "month" ? 4 : period === "all" ? 3 : 0}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
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
              formatter={(value) => {
                const v = Number(value);
                const color = v > 0 ? "#10b981" : v < 0 ? "#ef4444" : "var(--text-muted)";
                const sign = v > 0 ? "+" : "";
                return [`${sign}${v}`, "Зміна"];
              }}
              labelFormatter={(label) => String(label)}
              itemStyle={{ fontFamily: "'JetBrains Mono', monospace" }}
            />
            <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
            {avgLine !== 0 && (
              <ReferenceLine
                y={avgLine}
                stroke="var(--text-muted)"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: avgLabel,
                  position: "insideTopRight",
                  fill: "var(--text-muted)",
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
            )}
            <Bar dataKey="delta" radius={[2, 2, 0, 0]} maxBarSize={24}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.delta > 0
                      ? "#10b981"
                      : entry.delta < 0
                        ? "#ef4444"
                        : "var(--text-muted)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
