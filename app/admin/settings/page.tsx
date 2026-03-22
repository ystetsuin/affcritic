"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface PipelineResult {
  embeddingsGenerated: number;
  groupsCreated: number;
  groupsUpdated: number;
  summariesGenerated: number;
  pendingTagsCreated: number;
  errors: string[];
  durationSeconds: number;
}

export default function AdminSettingsPage() {
  const [cronInterval, setCronInterval] = useState("");
  const [lastScrapeAt, setLastScrapeAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  // Pipeline
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [pipelineError, setPipelineError] = useState("");

  // Scraper
  const [scraperHours, setScraperHours] = useState(24);
  const [scraperRunning, setScraperRunning] = useState(false);
  const [scraperResult, setScraperResult] = useState<{ postsNew: number; postsSkipped: number; durationSeconds: number } | null>(null);
  const [scraperError, setScraperError] = useState("");

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    setCronInterval(data.cron_interval ?? "8");
    setLastScrapeAt(data.last_scrape_at ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaveError("");
    setSaveOk(false);
    const num = parseInt(cronInterval, 10);
    if (isNaN(num) || num < 1 || num > 24) {
      setSaveError("Інтервал має бути від 1 до 24 годин");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "cron_interval", value: String(num) }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setSaveError(data.error || "Failed to save");
      return;
    }
    setSaveOk(true);
    setTimeout(() => setSaveOk(false), 2000);
  };

  const handleRunScraper = async () => {
    setScraperRunning(true);
    setScraperResult(null);
    setScraperError("");
    try {
      const res = await fetch("/api/scraper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: scraperHours }),
      });
      if (!res.ok) {
        const data = await res.json();
        setScraperError(data.error || "Scraper failed");
      } else {
        setScraperResult(await res.json());
        fetchSettings(); // refresh last_scrape_at
      }
    } catch (err) {
      setScraperError(err instanceof Error ? err.message : "Network error");
    }
    setScraperRunning(false);
  };

  const handleRunPipeline = async () => {
    setPipelineRunning(true);
    setPipelineResult(null);
    setPipelineError("");
    try {
      const res = await fetch("/api/pipeline/run", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setPipelineError(data.error || "Pipeline failed");
      } else {
        setPipelineResult(await res.json());
      }
    } catch (err) {
      setPipelineError(err instanceof Error ? err.message : "Network error");
    }
    setPipelineRunning(false);
  };

  if (loading) return <div className="mx-auto max-w-2xl px-4 py-6 text-sm text-muted-foreground">Завантаження...</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-8">
      <h1 className="text-xl font-bold">Налаштування</h1>

      {/* Cron interval */}
      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Scraper Cron</h2>

        <div className="flex items-center gap-3">
          <label className="text-sm">Інтервал (годин):</label>
          <input
            type="number"
            min={1}
            max={24}
            value={cronInterval}
            onChange={(e) => setCronInterval(e.target.value)}
            className="h-8 w-20 rounded-md border border-input bg-background px-3 text-center text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "..." : "Зберегти"}
          </Button>
          {saveOk && <span className="text-sm text-emerald-600">Збережено</span>}
        </div>
        {saveError && <p className="mt-2 text-sm text-destructive">{saveError}</p>}

        <div className="mt-3 text-sm text-muted-foreground">
          Останній запуск:{" "}
          {lastScrapeAt
            ? new Date(lastScrapeAt).toLocaleString("uk-UA")
            : "Ще не запускався"}
        </div>
      </section>

      {/* Manual scraper run */}
      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Scraper</h2>
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
          <Button onClick={handleRunScraper} disabled={scraperRunning}>
            {scraperRunning ? "Збирає..." : "Запустити Scraper"}
          </Button>
        </div>
        {scraperError && <p className="mt-2 text-sm text-destructive">{scraperError}</p>}
        {scraperResult && (
          <div className="mt-2 text-sm text-muted-foreground">
            {scraperResult.postsNew} new, {scraperResult.postsSkipped} skipped ({scraperResult.durationSeconds}с)
          </div>
        )}
      </section>

      {/* Manual pipeline run */}
      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Pipeline</h2>

        <Button onClick={handleRunPipeline} disabled={pipelineRunning}>
          {pipelineRunning ? "Виконується..." : "Запустити pipeline вручну"}
        </Button>

        {pipelineError && (
          <p className="mt-3 text-sm text-destructive">{pipelineError}</p>
        )}

        {pipelineResult && (
          <div className="mt-3 rounded border border-border bg-muted/30 p-3 text-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <span className="text-muted-foreground">Embeddings:</span>
              <span>{pipelineResult.embeddingsGenerated}</span>
              <span className="text-muted-foreground">Нові групи:</span>
              <span>{pipelineResult.groupsCreated}</span>
              <span className="text-muted-foreground">Оновлені групи:</span>
              <span>{pipelineResult.groupsUpdated}</span>
              <span className="text-muted-foreground">Summaries:</span>
              <span>{pipelineResult.summariesGenerated}</span>
              <span className="text-muted-foreground">Pending тегів:</span>
              <span>{pipelineResult.pendingTagsCreated}</span>
              <span className="text-muted-foreground">Час:</span>
              <span>{pipelineResult.durationSeconds}с</span>
            </div>
            {pipelineResult.errors.length > 0 && (
              <div className="mt-2 border-t border-border pt-2">
                <p className="font-medium text-destructive">Помилки:</p>
                {pipelineResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">{err}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
