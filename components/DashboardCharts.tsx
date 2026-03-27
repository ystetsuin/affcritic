"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface ChartData {
  date: string;
  cost_usd: number;
  posts_processed: number;
  summaries_created: number;
  raw_unprocessed: number;
}

interface ChartResponse {
  data: ChartData[];
  totals: { cost_usd: number; posts_processed: number; summaries_created: number; raw_unprocessed: number };
  period: string;
}

const PERIODS = [
  { value: "day", label: "День" },
  { value: "week", label: "Тиждень" },
  { value: "month", label: "Місяць" },
  { value: "all", label: "Весь час" },
];

export function DashboardCharts() {
  const [period, setPeriod] = useState("week");
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchChart = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/charts?period=${period}`);
    setChart(await res.json());
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchChart(); }, [fetchChart]);

  const formatDate = (d: unknown) => {
    const date = new Date(String(d));
    return date.toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
  };

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Статистика</h2>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                period === p.value
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      ) : !chart || chart.data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Немає даних за цей період</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* GPT Cost */}
          <div className="rounded-lg border border-border p-4">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-xs font-medium text-muted-foreground">Витрати GPT</span>
              <span className="text-sm font-bold">${chart.totals.cost_usd.toFixed(4)}</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toFixed(6)}`, "Cost"]}
                  labelFormatter={formatDate}
                  contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                />
                <Bar dataKey="cost_usd" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Posts */}
          <div className="rounded-lg border border-border p-4">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-xs font-medium text-muted-foreground">Пости</span>
              <span className="text-sm">
                <span className="font-bold">{chart.totals.posts_processed}</span>
                <span className="text-muted-foreground"> processed, </span>
                <span className="font-bold">{chart.totals.summaries_created}</span>
                <span className="text-muted-foreground"> summaries, </span>
                <span className="font-bold">{chart.totals.raw_unprocessed}</span>
                <span className="text-muted-foreground"> unprocessed</span>
              </span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  labelFormatter={formatDate}
                  contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="posts_processed" stroke="#6366f1" strokeWidth={2} dot={false} name="Processed" />
                <Line type="monotone" dataKey="summaries_created" stroke="#f59e0b" strokeWidth={2} dot={false} name="Summaries" />
                <Line type="monotone" dataKey="raw_unprocessed" stroke="#ef4444" strokeWidth={2} dot={false} name="Unprocessed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
