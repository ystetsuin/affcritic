import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { logPipeline } from "../../../../lib/logger";

const execAsync = promisify(exec);

const ALLOWED_HOURS = [12, 24, 48];

export async function POST(request: NextRequest) {
  let body: { hours?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hours = body.hours ?? 24;
  if (!ALLOWED_HOURS.includes(hours)) {
    return NextResponse.json(
      { error: `hours must be one of: ${ALLOWED_HOURS.join(", ")}` },
      { status: 400 },
    );
  }

  const projectRoot = path.resolve(process.cwd());
  const cmd = `python3 ${path.join(projectRoot, "scraper", "main.py")} --hours=${hours}`;

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: projectRoot,
      timeout: 300_000, // 5 min
      env: { ...process.env },
    });

    const output = stdout + (stderr ? `\n${stderr}` : "");

    // Parse stats from output
    const totalMatch = output.match(/TOTAL:\s*(\d+)\s*read,\s*(\d+)\s*new,\s*(\d+)\s*skipped/);
    const durationMatch = output.match(/Duration:\s*([\d.]+)s/);

    const result = {
      hours,
      postsRead: totalMatch ? parseInt(totalMatch[1]) : 0,
      postsNew: totalMatch ? parseInt(totalMatch[2]) : 0,
      postsSkipped: totalMatch ? parseInt(totalMatch[3]) : 0,
      durationSeconds: durationMatch ? parseFloat(durationMatch[1]) : 0,
      output: output.slice(-2000), // last 2000 chars
    };

    await logPipeline("admin", null, {
      action: "run_scraper",
      details: { hours, postsNew: result.postsNew, postsSkipped: result.postsSkipped },
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stderr = (err as { stderr?: string }).stderr ?? "";

    await logPipeline("admin", null, {
      action: "run_scraper",
      details: { hours, error: msg },
    });

    return NextResponse.json(
      { error: "Scraper failed", details: msg, stderr: stderr.slice(-1000) },
      { status: 500 },
    );
  }
}
