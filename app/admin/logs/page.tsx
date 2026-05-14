"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";

interface LogEntry {
  id: string;
  type: string;
  postId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

const LOG_TYPES = ["all", "scraper", "embedding", "grouping", "gpt", "quality", "admin", "stats"] as const;

const TYPE_COLORS: Record<string, string> = {
  scraper: "bg-blue-500/20 text-blue-400 light:bg-blue-50 light:text-blue-700",
  embedding: "bg-violet-500/20 text-violet-400 light:bg-violet-50 light:text-violet-700",
  grouping: "bg-amber-500/20 text-amber-400 light:bg-amber-50 light:text-amber-700",
  gpt: "bg-emerald-500/20 text-emerald-400 light:bg-emerald-50 light:text-emerald-700",
  quality: "bg-cyan-500/20 text-cyan-400 light:bg-cyan-50 light:text-cyan-700",
  admin: "bg-red-500/20 text-red-400 light:bg-red-50 light:text-red-700",
  stats: "bg-teal-500/20 text-teal-400 light:bg-teal-50 light:text-teal-700",
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [postIdFilter, setPostIdFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Expanded
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (postIdFilter.trim()) params.set("post_id", postIdFilter.trim());
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);

    try {
      const res = await fetch(`/api/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.pagination.total);
      }
    } catch (err) {
      console.error("[admin/logs] fetchLogs error:", err);
    }
    setLoading(false);
  }, [page, typeFilter, postIdFilter, fromDate, toDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 30000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchLogs]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Pipeline Logs</h1>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto-refresh (30с)
        </label>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          {LOG_TYPES.map((t) => (
            <option key={t} value={t}>{t === "all" ? "Всі типи" : t}</option>
          ))}
        </select>
        <input
          value={postIdFilter}
          onChange={(e) => { setPostIdFilter(e.target.value); setPage(1); }}
          placeholder="Post ID (UUID)"
          className="h-8 w-48 rounded-md border border-input bg-background px-3 text-sm font-mono focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(1); }}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        />
        {(typeFilter !== "all" || postIdFilter || fromDate || toDate) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setTypeFilter("all"); setPostIdFilter(""); setFromDate(""); setToDate(""); setPage(1); }}
          >
            Скинути
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Завантаження...</p>
      ) : logs.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Логів не знайдено</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3">Тип</th>
                <th className="pb-2 pr-3">Час</th>
                <th className="pb-2 pr-3">Post ID</th>
                <th className="pb-2">Payload</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="cursor-pointer border-b border-border/50 hover:bg-muted/30"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <td className="py-2 pr-3">
                    <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[log.type] ?? "bg-muted text-muted-foreground"}`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("uk-UA", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
                    })}
                  </td>
                  <td className="py-2 pr-3">
                    {log.postId ? (
                      <span className="font-mono text-xs text-muted-foreground">
                        {log.postId.slice(0, 8)}…
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {expandedId === log.id ? (
                      <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-2 font-mono text-xs text-foreground">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    ) : (
                      <span className="truncate">
                        {JSON.stringify(log.payload).slice(0, 80)}
                        {JSON.stringify(log.payload).length > 80 ? "…" : ""}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>←</Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages} ({total})</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>→</Button>
        </div>
      )}
    </div>
  );
}
