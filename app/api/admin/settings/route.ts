import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { logPipeline } from "../../../../lib/logger";

const ALLOWED_KEYS = new Set(["cron_interval", "last_scrape_at"]);

const VALIDATORS: Record<string, (value: string) => string | null> = {
  cron_interval: (value) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 24) {
      return "cron_interval must be a number between 1 and 24";
    }
    return null;
  },
};

export async function GET() {
  const rows = await prisma.adminSetting.findMany();

  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  let body: { key?: string; value?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { key, value } = body;

  if (!key || value === undefined) {
    return NextResponse.json({ error: "key and value are required" }, { status: 400 });
  }

  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: `Key "${key}" is not allowed` }, { status: 400 });
  }

  const validator = VALIDATORS[key];
  if (validator) {
    const errorMsg = validator(value);
    if (errorMsg) {
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }
  }

  await prisma.adminSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });

  await logPipeline("admin", null, { action: "update_setting", details: { key, value } });

  return NextResponse.json({ [key]: value });
}
