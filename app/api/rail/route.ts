import type { LL } from "@/lib/geo";
import { routeOnRails } from "@/lib/railRouter";

export const maxDuration = 60;

const MAX_POINTS = 400;
const BUDGET_MS = 50000;

// GET so identical routes are served from the CDN cache: /api/rail?p=lng,lat;lng,lat;...&snap=5
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const raw = (sp.get("p") ?? "").split(";").filter(Boolean);
  if (raw.length > MAX_POINTS) return Response.json({ error: `At most ${MAX_POINTS} points.` }, { status: 413 });
  const points = raw
    .map((s) => s.split(",").map(Number) as LL)
    .filter((p) => p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90);
  if (points.length < 2 || points.length !== raw.length) return Response.json({ error: "Need at least two valid points." }, { status: 400 });
  const snap = Number(sp.get("snap"));
  const snapKm = Number.isFinite(snap) && snap > 0 ? Math.max(2, Math.min(15, snap)) : 5;

  const route = await routeOnRails(points, Date.now() + BUDGET_MS, snapKm);
  const cache = route.approx.length
    ? "public, s-maxage=300"
    : "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400";
  return Response.json(route, { headers: { "Cache-Control": cache } });
}
