"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardCharts } from "@/components/DashboardCharts";

interface Stats {
  channels: { total: number; active: number };
  channelCategories: number;
  posts: { total: number; deleted: number };
  rawPosts: { processed: number; unprocessed: number };
  tags: { active: number; pending: number };
  tagCategories: number;
  lastScrapeAt: string | null;
  cronInterval: string;
}

interface PipelineResult {
  embeddingsGenerated: number;
  groupsCreated: number;
  groupsUpdated: number;
  summariesGenerated: number;
  pendingTagsCreated: number;
  errors: string[];
  durationSeconds: number;
}

interface LogEntry {
  id: string;
  type: string;
  postId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

const LOG_TYPE_COLORS: Record<string, string> = {
  scraper: "bg-blue-50 text-blue-700",
  embedding: "bg-violet-50 text-violet-700",
  grouping: "bg-amber-50 text-amber-700",
  gpt: "bg-emerald-50 text-emerald-700",
  quality: "bg-cyan-50 text-cyan-700",
  admin: "bg-red-50 text-red-700",
};

const NAV_ITEMS = [
  { href: "/admin/channels", label: "Канали", desc: "Управління TG-каналами" },
  { href: "/admin/topics", label: "Тематики каналів", desc: "Навігація, DnD сортування" },
  { href: "/admin/posts", label: "Пости", desc: "Merge, split, edit, delete" },
  { href: "/admin/tags", label: "Теги", desc: "Approve, reject, merge", badge: "pending" as const },
  { href: "/admin/logs", label: "Логи", desc: "Pipeline logs" },
  { href: "/admin/settings", label: "Налаштування", desc: "Cron, pipeline" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);

  // Scraper state
  const [scraperHours, setScraperHours] = useState(24);
  const [scraperRunning, setScraperRunning] = useState(false);
  const [scraperResult, setScraperResult] = useState<{
    postsNew: number; postsSkipped: number; postsRead: number; durationSeconds: number;
  } | null>(null);
  const [scraperError, setScraperError] = useState("");

  // Recent logs
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);

  const fetchStats = useCallback(async () => {
    const [statsRes, logsRes] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/logs?limit=5"),
    ]);
    setStats(await statsRes.json());
    const logsData = await logsRes.json();
    setRecentLogs(logsData.logs ?? []);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleRunScraper = async () => {
    setScraperRunning(true);
    setScraperResult(null);
    setScraperError("");
    setPipelineResult(null);
    try {
      // 1. Run scraper
      const scraperRes = await fetch("/api/scraper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: scraperHours }),
      });
      if (!scraperRes.ok) {
        const data = await scraperRes.json();
        setScraperError(data.error || "Scraper failed");
        setScraperRunning(false);
        return;
      }
      const sResult = await scraperRes.json();
      setScraperResult(sResult);

      // 2. Auto-run pipeline
      setPipelineRunning(true);
      const pipelineRes = await fetch("/api/pipeline/run", { method: "POST" });
      if (pipelineRes.ok) {
        setPipelineResult(await pipelineRes.json());
      }
      setPipelineRunning(false);
    } catch (err) {
      setScraperError(err instanceof Error ? err.message : "Network error");
    }
    setScraperRunning(false);
    fetchStats();
  };

  const handleRunPipeline = async () => {
    setPipelineRunning(true);
    setPipelineResult(null);
    try {
      const res = await fetch("/api/pipeline/run", { method: "POST" });
      setPipelineResult(await res.json());
    } catch (err) {
      console.error(err);
    }
    setPipelineRunning(false);
    fetchStats();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-6 text-xl font-bold">Admin Dashboard</h1>

      {/* Metrics */}
      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Канали" value={`${stats.channels.active} / ${stats.channels.total}`} sub="active / total" />
          <MetricCard label="Категорії каналів" value={String(stats.channelCategories)} />
          <MetricCard label="Пости" value={`${stats.posts.total - stats.posts.deleted}`} sub={`${stats.posts.deleted} deleted`} />
          <MetricCard label="Raw Posts" value={`${stats.rawPosts.unprocessed}`} sub={`unprocessed / ${stats.rawPosts.processed + stats.rawPosts.unprocessed} total`} />
          <MetricCard
            label="Теги"
            value={String(stats.tags.active)}
            sub={stats.tags.pending > 0 ? `${stats.tags.pending} pending` : "0 pending"}
            highlight={stats.tags.pending > 0}
          />
          <MetricCard label="Категорії тегів" value={String(stats.tagCategories)} />
          <MetricCard
            label="Останній scrape"
            value={stats.lastScrapeAt ? new Date(stats.lastScrapeAt).toLocaleString("uk-UA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
          />
          <MetricCard label="Cron інтервал" value={`${stats.cronInterval}h`} />
        </div>
      )}

      {/* Charts */}
      <DashboardCharts />

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Quick Actions</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Scraper */}
          <div className="rounded-lg border border-border p-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Scraper</div>
            <div className="flex items-center gap-2">
              <select
                value={scraperHours}
                onChange={(e) => setScraperHours(Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                disabled={scraperRunning}
              >
                <option value={12}>12 годин</option>
                <option value={24}>1 день</option>
                <option value={48}>2 дні</option>
              </select>
              <Button onClick={handleRunScraper} disabled={scraperRunning || pipelineRunning}>
                {scraperRunning ? "Збирає..." : "Запустити"}
              </Button>
            </div>
            {scraperError && <p className="mt-2 text-xs text-destructive">{scraperError}</p>}
            {scraperResult && (
              <div className="mt-2 text-xs text-muted-foreground">
                {scraperResult.postsNew} new, {scraperResult.postsSkipped} skipped ({scraperResult.durationSeconds}с)
              </div>
            )}
          </div>

          {/* Pipeline */}
          <div className="rounded-lg border border-border p-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Pipeline</div>
            <Button onClick={handleRunPipeline} disabled={pipelineRunning || scraperRunning}>
              {pipelineRunning ? "Виконується..." : "Запустити"}
            </Button>
          </div>
        </div>

        {pipelineResult && (
          <div className="mt-3 rounded border border-border bg-muted/30 p-3 text-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
              <span>Embeddings: {pipelineResult.embeddingsGenerated}</span>
              <span>Нові групи: {pipelineResult.groupsCreated}</span>
              <span>Оновлені: {pipelineResult.groupsUpdated}</span>
              <span>Summaries: {pipelineResult.summariesGenerated}</span>
              <span>Pending тегів: {pipelineResult.pendingTagsCreated}</span>
              <span>Час: {pipelineResult.durationSeconds}с</span>
            </div>
            {pipelineResult.errors.length > 0 && (
              <div className="mt-2 text-xs text-destructive">
                {pipelineResult.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent logs */}
      {recentLogs.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Останні логи</h2>
          <div className="space-y-1">
            {recentLogs.map((log) => (
              <Link
                key={log.id}
                href={`/admin/logs?type=${log.type}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
              >
                <span className={`shrink-0 rounded-sm px-2 py-0.5 text-xs font-medium ${LOG_TYPE_COLORS[log.type] ?? "bg-muted text-muted-foreground"}`}>
                  {log.type}
                </span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {formatLogPreview(log.payload)}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelative(log.createdAt)}
                </span>
              </Link>
            ))}
          </div>
          <Link href="/admin/logs" className="mt-2 inline-block text-xs text-muted-foreground transition-colors hover:text-foreground">
            Всі логи →
          </Link>
        </div>
      )}

      {/* Navigation */}
      <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Розділи</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
          >
            <div>
              <div className="font-medium">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.desc}</div>
            </div>
            {item.badge === "pending" && stats && stats.tags.pending > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {stats.tags.pending}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatRelative(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "щойно";
  if (min < 60) return `${min}хв`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}год`;
  return `${Math.floor(hr / 24)}д`;
}

function formatLogPreview(payload: Record<string, unknown>): string {
  if (payload.action) {
    const action = String(payload.action);
    const details = payload.details as Record<string, unknown> | undefined;
    if (details?.username) return `${action}: @${details.username}`;
    if (details?.name) return `${action}: ${details.name}`;
    if (details?.postId) return `${action}: ${String(details.postId).slice(0, 8)}…`;
    return action;
  }
  if (payload.posts_processed !== undefined) return `${payload.posts_processed} embeddings`;
  if (payload.channels_total !== undefined) return `${payload.posts_new ?? 0} new / ${payload.channels_total} channels`;
  if (payload.decision) return `${payload.decision}: ${String(payload.target_group_id ?? "").slice(0, 8)}…`;
  if (payload.summary_score !== undefined) return `score: ${payload.summary_score} (${payload.status})`;
  if (payload.error) return `error: ${String(payload.error).slice(0, 60)}`;
  return JSON.stringify(payload).slice(0, 60);
}

function MetricCard({ label, value, sub, highlight }: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      {sub && (
        <div className={`text-xs ${highlight ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
          {sub}
        </div>
      )}
    </div>
  );
}
