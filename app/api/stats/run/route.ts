import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { logPipeline } from "../../../../lib/logger";

const LOCK_FILE = "/tmp/affcritic-stats-collector.lock";

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLock(): { pid: number; startedAt: string } | null {
  try {
    const raw = fs.readFileSync(LOCK_FILE, "utf8").trim();
    const [pidStr, startedAt] = raw.split("\n");
    const pid = parseInt(pidStr, 10);
    if (!Number.isFinite(pid)) return null;
    return { pid, startedAt: startedAt ?? "" };
  } catch {
    return null;
  }
}

function clearStaleLock(): void {
  try { fs.unlinkSync(LOCK_FILE); } catch { /* ignore */ }
}

export async function POST() {
  // Concurrency guard: refuse if another collector is alive
  const existing = readLock();
  if (existing) {
    if (isProcessAlive(existing.pid)) {
      return NextResponse.json(
        {
          error: "Already running",
          pid: existing.pid,
          startedAt: existing.startedAt,
        },
        { status: 409 },
      );
    }
    clearStaleLock();
  }

  const projectRoot = path.resolve(process.cwd());
  const scriptPath = path.join(projectRoot, "scraper", "stats_collector.py");

  const child = spawn("python3", [scriptPath], {
    cwd: projectRoot,
    env: { ...process.env },
  });

  // Write lock with child PID + start time
  try {
    fs.writeFileSync(LOCK_FILE, `${child.pid}\n${new Date().toISOString()}\n`);
  } catch (err) {
    child.kill();
    return NextResponse.json(
      { error: "Failed to create lock file", details: String(err) },
      { status: 500 },
    );
  }

  // 10-min timeout to match previous behavior
  const timer = setTimeout(() => {
    child.kill("SIGTERM");
  }, 600_000);

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  const exitCode: number | null = await new Promise((resolve) => {
    child.on("close", (code) => resolve(code));
  });

  clearTimeout(timer);
  clearStaleLock();

  const output = stdout + (stderr ? `\n${stderr}` : "");

  if (exitCode !== 0) {
    await logPipeline("admin", null, {
      action: "run_stats_collector",
      details: { error: `exit ${exitCode}`, output: output.slice(-500) },
    });
    return NextResponse.json(
      {
        error: "Stats collector failed",
        exitCode,
        stderr: stderr.slice(-1000),
      },
      { status: 500 },
    );
  }

  const collectedMatch = output.match(/Collected stats for (\d+)\/(\d+)/);
  const durationMatch = output.match(/Duration:\s*([\d.]+)s/);

  const result = {
    channelsProcessed: collectedMatch ? parseInt(collectedMatch[1]) : 0,
    channelsTotal: collectedMatch ? parseInt(collectedMatch[2]) : 0,
    durationSeconds: durationMatch ? parseFloat(durationMatch[1]) : 0,
    output: output.slice(-2000),
  };

  await logPipeline("admin", null, {
    action: "run_stats_collector",
    details: { channelsProcessed: result.channelsProcessed, channelsTotal: result.channelsTotal },
  });

  return NextResponse.json(result);
}

// GET: query current status without starting a run
export async function GET() {
  const existing = readLock();
  if (!existing) return NextResponse.json({ running: false });
  if (!isProcessAlive(existing.pid)) {
    clearStaleLock();
    return NextResponse.json({ running: false, staleCleared: true });
  }
  return NextResponse.json({
    running: true,
    pid: existing.pid,
    startedAt: existing.startedAt,
  });
}
