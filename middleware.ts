import { NextResponse, type NextRequest } from "next/server";

// Per-IP fixed-window limits. Counters live in each server instance's memory, so this throttles
// abusive clients but is not a global quota; volumetric DDoS is absorbed by the hosting edge (Vercel).
// Building a long route fires one /api/train call per stop and per leg, so the train limit allows bursts.
const WINDOW_MS = 60_000;
const LIMITS: Record<string, number> = {
  "/api/train": 150,
  "/api/window": 20,
};
const MAX_BODY_BYTES = 512 * 1024;
const MAX_KEYS = 50_000;

const hits = new Map<string, { n: number; reset: number }>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < WINDOW_MS && hits.size < MAX_KEYS) return;
  lastSweep = now;
  for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  if (hits.size >= MAX_KEYS) hits.clear();
}

function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const route = Object.keys(LIMITS).find((r) => path === r || path.startsWith(r + "/"));
  if (!route) return NextResponse.next();

  if (req.method !== "GET" && req.method !== "POST" && req.method !== "HEAD") {
    return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }

  const now = Date.now();
  sweep(now);
  const limit = LIMITS[route];
  const key = route + "|" + clientIp(req);
  let e = hits.get(key);
  if (!e || e.reset <= now) {
    e = { n: 0, reset: now + WINDOW_MS };
    hits.set(key, e);
  }
  e.n++;

  const retry = Math.ceil((e.reset - now) / 1000);
  const headers = {
    "RateLimit-Limit": String(limit),
    "RateLimit-Remaining": String(Math.max(0, limit - e.n)),
    "RateLimit-Reset": String(retry),
  };
  if (e.n > limit) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429, headers: { ...headers, "Retry-After": String(retry) } }
    );
  }
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

export const config = { matcher: "/api/:path*" };
