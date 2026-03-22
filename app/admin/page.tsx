"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Settings, Loader2 } from "lucide-react";
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

const METRIC_LINKS: Record<string, string> = {
  "Канали": "/admin/channels",
  "Категорії каналів": "/admin/topics",
  "Пости": "/admin/posts",
  "Raw Posts": "/admin/posts",
  "Теги": "/admin/tags",
  "Категорії тегів": "/admin/tags",
  "Останній scrape": "/admin/settings",
  "Cron інтервал": "/admin/settings",
};

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
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <Link href="/admin/settings" className="text-muted-foreground transition-colors hover:text-foreground">
          <Settings className="size-5" />
        </Link>
      </div>

      {/* Metrics */}
      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Канали" value={`${stats.channels.active} / ${stats.channels.total}`} sub="active / total" href={METRIC_LINKS["Канали"]} />
          <MetricCard label="Категорії каналів" value={String(stats.channelCategories)} href={METRIC_LINKS["Категорії каналів"]} />
          <MetricCard label="Пости" value={`${stats.posts.total - stats.posts.deleted}`} sub={`${stats.posts.deleted} deleted`} href={METRIC_LINKS["Пости"]} />
          <MetricCard label="Raw Posts" value={`${stats.rawPosts.unprocessed}`} sub={`unprocessed / ${stats.rawPosts.processed + stats.rawPosts.unprocessed} total`} href={METRIC_LINKS["Raw Posts"]} subColor={stats.rawPosts.unprocessed > 0 ? "text-red-600" : "text-emerald-600"} />
          <MetricCard
            label="Теги"
            value={String(stats.tags.active)}
            sub={stats.tags.pending > 0 ? `${stats.tags.pending} pending` : "0 pending"}
            highlight={stats.tags.pending > 0}
            href={METRIC_LINKS["Теги"]}
          />
          <MetricCard label="Категорії тегів" value={String(stats.tagCategories)} href={METRIC_LINKS["Категорії тегів"]} />
          <MetricCard
            label="Останній scrape"
            value={stats.lastScrapeAt ? new Date(stats.lastScrapeAt).toLocaleString("uk-UA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
            href={METRIC_LINKS["Останній scrape"]}
          />
          <MetricCard label="Cron інтервал" value={`${stats.cronInterval}h`} href={METRIC_LINKS["Cron інтервал"]} />
        </div>
      )}

      {/* Charts */}
      <DashboardCharts />

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Quick Actions</h2>
        <div className="grid grid-cols-[100px_auto_1fr] items-center gap-x-4 gap-y-3">
          {/* Scraper row */}
          <span className="text-xs font-medium text-muted-foreground">Scraper</span>
          <div className="inline-flex items-center gap-2">
            <select
              value={scraperHours}
              onChange={(e) => setScraperHours(Number(e.target.value))}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs"
              disabled={scraperRunning}
            >
              <option value={12}>12 годин</option>
              <option value={24}>1 день</option>
              <option value={48}>2 дні</option>
            </select>
            <ActionButton running={scraperRunning} disabled={pipelineRunning} onClick={handleRunScraper} />
          </div>
          <span className="text-xs">
            {scraperRunning ? (
              <span className="inline-flex items-center gap-1 text-amber-600"><Spinner /> Виконується...</span>
            ) : scraperError ? (
              <span className="text-red-600">Помилка · {scraperError}</span>
            ) : scraperResult ? (
              <span className="text-emerald-600">
                Успішно · {scraperResult.postsNew} new, {scraperResult.postsSkipped} skipped ({scraperResult.durationSeconds}с)
              </span>
            ) : (
              <span className="text-muted-foreground">Не запускався</span>
            )}
          </span>

          {/* Pipeline row */}
          <span className="text-xs font-medium text-muted-foreground">Pipeline</span>
          <div className="inline-flex items-center gap-2">
            {stats && (
              <span className={`text-xs ${stats.rawPosts.unprocessed > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {stats.rawPosts.unprocessed} unprocessed
              </span>
            )}
            <ActionButton running={pipelineRunning} disabled={scraperRunning} onClick={handleRunPipeline} />
          </div>
          <span className="text-xs">
            {pipelineRunning ? (
              <span className="inline-flex items-center gap-1 text-amber-600"><Spinner /> Виконується...</span>
            ) : pipelineResult?.errors?.length ? (
              <span className="text-red-600">Помилка · {pipelineResult.errors[0]}</span>
            ) : pipelineResult ? (
              <span className="text-emerald-600">Успішно · {pipelineResult.durationSeconds}с</span>
            ) : (
              <span className="text-muted-foreground">Не запускався</span>
            )}
          </span>

          {/* Pipeline results inline */}
          {pipelineResult && !pipelineResult.errors?.length && (
            <>
              <span />
              <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span>Embeddings: {pipelineResult.embeddingsGenerated}</span>
                <span>Summaries: {pipelineResult.summariesGenerated}</span>
                <span>Нові групи: {pipelineResult.groupsCreated}</span>
                <span>Оновлені: {pipelineResult.groupsUpdated}</span>
                <span>Pending тегів: {pipelineResult.pendingTagsCreated}</span>
              </div>
            </>
          )}
        </div>
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

function MetricCard({ label, value, sub, highlight, href, subColor }: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  href?: string;
  subColor?: string;
}) {
  const subClass = subColor ?? (highlight ? "text-amber-600 font-medium" : "text-muted-foreground");
  const content = (
    <>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      {sub && (
        <div className={`text-xs ${subClass}`}>
          {sub}
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="rounded-lg border border-border p-3 transition-colors hover:bg-muted">
        {content}
      </Link>
    );
  }

  return <div className="rounded-lg border border-border p-3">{content}</div>;
}

function Spinner() {
  return <Loader2 className="size-3 animate-spin" />;
}

function ActionButton({ running, disabled, onClick }: { running: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={running || disabled}
      className="inline-flex h-7 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {running && <Spinner />}
      {running ? "Виконується..." : "Запустити"}
    </button>
  );
}
