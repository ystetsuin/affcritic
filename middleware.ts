import { NextRequest, NextResponse } from "next/server";

/**
 * Basic Auth для адмін-зони.
 *
 * Protected:
 *   - /admin/*                     — UI-сторінки адмінки
 *   - /api/admin/*                 — administrativní API
 *   - /api/logs                    — pipeline_logs
 *   - /api/scraper/*               — запуск скрейпера
 *   - /api/pipeline/*              — запуск pipeline
 *   - /api/stats/*                 — запуск stats collector
 *   - POST/PATCH/PUT/DELETE на будь-який /api/* — мутації потребують auth
 *
 * Public (GET):
 *   - /                            — feed
 *   - /topics, /channels, /tags    — публічні сторінки
 *   - GET /api/posts, /api/channels, /api/tags, ... — read-only API
 *
 * Credentials в ENV: ADMIN_USER, ADMIN_PASS. Якщо не задано → 503.
 */

const ALWAYS_ADMIN_PREFIXES = [
  "/admin",
  "/api/admin",
  "/api/logs",
  "/api/scraper",
  "/api/pipeline",
  "/api/stats",
];

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function requiresAuth(req: NextRequest): boolean {
  const path = req.nextUrl.pathname;

  if (ALWAYS_ADMIN_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) {
    return true;
  }

  if (path.startsWith("/api/") && MUTATING_METHODS.has(req.method)) {
    return true;
  }

  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function checkAuth(req: NextRequest): boolean {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;
  if (!user || !pass) return false;

  const header = req.headers.get("authorization");
  if (!header) return false;

  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return false;

  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return false;
  }

  const idx = decoded.indexOf(":");
  if (idx < 0) return false;

  const u = decoded.slice(0, idx);
  const p = decoded.slice(idx + 1);
  return timingSafeEqual(u, user) && timingSafeEqual(p, pass);
}

export function middleware(req: NextRequest) {
  if (!requiresAuth(req)) return NextResponse.next();

  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;
  if (!user || !pass) {
    return new NextResponse(
      "Admin auth not configured. Set ADMIN_USER and ADMIN_PASS env vars.",
      { status: 503 },
    );
  }

  if (checkAuth(req)) return NextResponse.next();

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="AffCritic Admin", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/:path*",
  ],
};
