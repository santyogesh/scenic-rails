import { hav, type LL } from "./geo";
import { overpassQuery, tfetch } from "./overpass";
import type { RailRoute } from "./railTrack";

type Edge = { to: number; w: number };
type Graph = { at: Map<number, LL>; adj: Map<number, Edge[]> };

const BROUTER = "https://brouter.de/brouter";
const CHUNK_KM = 600;
const CHUNK_LEGS = 20;
const OVERPASS_CHUNK_KM = 250;
const MAX_IN_FLIGHT = 2;
const CACHE_MS = 7 * 86400000;
const SIMPLIFY_M = 8;
const PENALTY: Record<string, number> = { main: 1, branch: 1.15, industrial: 3, military: 3, tourism: 3, test: 3 };

const legCache = new Map<string, { path: LL[]; expiry: number }>();
const legKey = (a: LL, b: LL, snapKm: number) => `${a[0].toFixed(4)},${a[1].toFixed(4)}>${b[0].toFixed(4)},${b[1].toFixed(4)}@${snapKm}`;

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

async function fetchGraph(poly: LL[], radiusKm: number, deadline: number): Promise<Graph | null> {
  const C = poly.map((p) => `${p[1].toFixed(5)},${p[0].toFixed(5)}`).join(",");
  const q = `[out:json][timeout:25];
way["railway"="rail"]["service"!~"^(yard|siding|spur|crossover)$"](around:${Math.round(radiusKm * 1000)},${C});
out body;
>;
out skel qt;`;
  const els = await overpassQuery(q, deadline);
  if (!els) return null;
  const at = new Map<number, LL>();
  for (const e of els) if (e.type === "node") at.set(e.id, [e.lon, e.lat]);
  const adj = new Map<number, Edge[]>();
  const link = (a: number, b: number, w: number) => {
    let l = adj.get(a);
    if (!l) adj.set(a, (l = []));
    l.push({ to: b, w });
  };
  for (const e of els) {
    if (e.type !== "way" || !Array.isArray(e.nodes)) continue;
    const pen = PENALTY[e.tags?.usage] ?? 1.25;
    for (let i = 1; i < e.nodes.length; i++) {
      const a = at.get(e.nodes[i - 1]), b = at.get(e.nodes[i]);
      if (!a || !b) continue;
      const w = hav(a, b) * pen;
      link(e.nodes[i - 1], e.nodes[i], w);
      link(e.nodes[i], e.nodes[i - 1], w);
    }
  }
  return adj.size ? { at, adj } : null;
}

function nearNodes(g: Graph, p: LL, maxKm: number, k = 25): { id: number; d: number }[] {
  const out: { id: number; d: number }[] = [];
  const dLat = maxKm / 110.57, dLng = maxKm / (111.32 * Math.cos((p[1] * Math.PI) / 180));
  for (const [id, q] of g.at) {
    if (!g.adj.has(id) || Math.abs(q[1] - p[1]) > dLat || Math.abs(q[0] - p[0]) > dLng) continue;
    const d = hav(p, q);
    if (d <= maxKm) out.push({ id, d });
  }
  return out.sort((x, y) => x.d - y.d).slice(0, k);
}

class Heap {
  private a: [number, number][] = [];
  get size() { return this.a.length; }
  push(f: number, id: number) {
    const a = this.a;
    a.push([f, id]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): [number, number] {
    const a = this.a, top = a[0], last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/** A* from any node near `a` to any node near `b`; starting cost favours nodes closest to the station. */
function astar(g: Graph, a: LL, b: LL, snapKm: number): LL[] | null {
  const src = nearNodes(g, a, snapKm), dst = nearNodes(g, b, snapKm);
  if (!src.length || !dst.length) return null;
  const goal = new Set(dst.map((x) => x.id));
  const gs = new Map<number, number>(), prev = new Map<number, number>();
  const heap = new Heap();
  for (const s of src) {
    const g0 = s.d * 2;
    gs.set(s.id, g0);
    heap.push(g0 + hav(g.at.get(s.id)!, b), s.id);
  }
  let found = -1, steps = 0;
  while (heap.size && steps++ < 400000) {
    const [f, u] = heap.pop();
    const gu = gs.get(u)!;
    if (f - hav(g.at.get(u)!, b) > gu + 1e-9) continue;
    if (goal.has(u)) { found = u; break; }
    for (const { to, w } of g.adj.get(u) ?? []) {
      const nd = gu + w;
      if (nd < (gs.get(to) ?? Infinity)) {
        gs.set(to, nd);
        prev.set(to, u);
        heap.push(nd + hav(g.at.get(to)!, b), to);
      }
    }
  }
  if (found < 0) return null;
  const path: LL[] = [];
  for (let n: number | undefined = found; n !== undefined; n = prev.get(n)) path.push(g.at.get(n)!);
  path.reverse();
  return plausible(path, a, b, snapKm) ? simplify(path) : null;
}

/** Douglas-Peucker in metres on a local flat projection. */
function simplify(line: LL[]): LL[] {
  if (line.length < 3) return line;
  const cos = Math.cos((line[0][1] * Math.PI) / 180);
  const xy = line.map((p) => [p[0] * cos * 111320, p[1] * 110570]);
  const keep = new Uint8Array(line.length);
  keep[0] = keep[line.length - 1] = 1;
  const stack: [number, number][] = [[0, line.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    const [x1, y1] = xy[i], [x2, y2] = xy[j];
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    let best = -1, bd = SIMPLIFY_M;
    for (let k = i + 1; k < j; k++) {
      const d = Math.abs(dy * (xy[k][0] - x1) - dx * (xy[k][1] - y1)) / L;
      if (d > bd) { bd = d; best = k; }
    }
    if (best > 0) {
      keep[best] = 1;
      stack.push([i, best], [best, j]);
    }
  }
  return line.filter((_, k) => keep[k]);
}

const lineKm = (l: LL[]) => l.reduce((s, p, i) => (i ? s + hav(l[i - 1], p) : 0), 0);

/** BRouter's rail profile through all of `poly`; null on error, rate limit or an implausible detour. */
async function brouter(poly: LL[], deadline: number): Promise<LL[] | null> {
  const url = `${BROUTER}?lonlats=${poly.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join("|")}&profile=rail&alternativeidx=0&format=geojson`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const left = deadline - Date.now();
    if (left < 5000) return null;
    try {
      const r = await tfetch(url, {}, Math.min(30000, left - 1000));
      if (r.ok) {
        const coords = (await r.json())?.features?.[0]?.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return null;
        const line = coords.map((c: number[]) => [c[0], c[1]] as LL);
        return lineKm(line) <= lineKm(poly) * 2.5 + 30 ? line : null;
      }
      if (r.status !== 403 && r.status !== 429 && r.status < 500) return null;
    } catch {}
    await new Promise((res) => setTimeout(res, 3000));
  }
  return null;
}

/** Cut a route through several waypoints into one path per leg, at the point nearest each waypoint. */
function splitAt(line: LL[], poly: LL[]): LL[][] {
  const cuts = [0];
  for (let k = 1; k < poly.length - 1; k++) {
    let best = cuts[k - 1], bd = Infinity;
    for (let i = cuts[k - 1]; i < line.length; i++) {
      const d = hav(line[i], poly[k]);
      if (d < bd) { bd = d; best = i; }
    }
    cuts.push(best);
  }
  cuts.push(line.length - 1);
  return cuts.slice(1).map((c, k) => line.slice(cuts[k], c + 1));
}

function store(pts: LL[], i: number, path: LL[], snapKm: number, out: (LL[] | null)[]) {
  out[i] = path;
  legCache.set(legKey(pts[i], pts[i + 1], snapKm), { path, expiry: Date.now() + CACHE_MS });
}

/**
 * The path must start and end near its stations (BRouter stops at the nearest track to an off-network point), and
 * rail between two stations is rarely more than ~1.8x the straight distance; longer usually means a wrong-track snap.
 */
const plausible = (path: LL[], a: LL, b: LL, snapKm: number) =>
  hav(path[0], a) <= snapKm && hav(path[path.length - 1], b) <= snapKm && lineKm(path) <= hav(a, b) * 1.8 + 20;

async function viaBrouter(pts: LL[], legs: number[], snapKm: number, deadline: number, out: (LL[] | null)[]) {
  const poly = [pts[legs[0]], ...legs.map((i) => pts[i + 1])];
  const line = await brouter(poly, deadline);
  if (!line) return false;
  let all = true;
  splitAt(simplify(line), poly).forEach((path, k) => {
    const seg = path.length >= 2 ? path : [poly[k], poly[k + 1]];
    if (plausible(seg, poly[k], poly[k + 1], snapKm)) store(pts, legs[k], seg, snapKm, out);
    else all = false;
  });
  return all;
}

async function viaOverpass(pts: LL[], legs: number[], radiusKm: number, snapKm: number, deadline: number, out: (LL[] | null)[]) {
  const poly = [pts[legs[0]], ...legs.map((i) => pts[i + 1])];
  const g = await fetchGraph(poly, radiusKm, deadline);
  if (!g) return;
  for (const i of legs) {
    const path = astar(g, pts[i], pts[i + 1], snapKm);
    if (path) store(pts, i, path, snapKm, out);
  }
}

function group(legs: number[], legKm: number[], maxKm: number, maxLegs: number): number[][] {
  const out: number[][] = [];
  let cur: number[] = [], km = 0;
  for (const i of legs) {
    const gap = cur.length && cur[cur.length - 1] !== i - 1;
    if (cur.length && (gap || km + legKm[i] > maxKm || cur.length >= maxLegs)) { out.push(cur); cur = []; km = 0; }
    cur.push(i);
    km += legKm[i];
  }
  if (cur.length) out.push(cur);
  return out;
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let k = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (k < items.length) await fn(items[k++]); }));
}

/**
 * Route through `points` (stations in travel order) over OSM railway tracks: BRouter's rail profile first,
 * then an Overpass track graph. Stretches with no match are joined straight and listed in `approx` as index ranges into `line`.
 */
export async function routeOnRails(points: LL[], deadline: number, snapKm = 5): Promise<RailRoute> {
  const pts = points.filter((p, i) => i === 0 || hav(points[i - 1], p) > 0.3);
  const n = pts.length - 1;
  const legKm = Array.from({ length: n }, (_, i) => hav(pts[i], pts[i + 1]));
  const radius = (km: number) => clamp(km * 0.12, snapKm + 3, 25);
  const paths: (LL[] | null)[] = new Array(n).fill(null);

  const now = Date.now();
  for (let i = 0; i < n; i++) {
    const hit = legCache.get(legKey(pts[i], pts[i + 1], snapKm));
    if (hit && hit.expiry > now) paths[i] = hit.path;
  }

  const missing = () => paths.map((p, i) => (p ? -1 : i)).filter((i) => i >= 0);

  // BRouter rejects a whole request if one waypoint is off the network, so failed chunks are retried leg by leg
  // before falling back to the (slower) Overpass graph.
  const chunks = group(missing(), legKm, CHUNK_KM, CHUNK_LEGS);
  await pool(chunks, MAX_IN_FLIGHT, async (c) => { await viaBrouter(pts, c, snapKm, deadline, paths).catch(() => false); });
  await pool(missing(), MAX_IN_FLIGHT, async (i) => { await viaBrouter(pts, [i], snapKm, deadline, paths).catch(() => false); });
  await pool(group(missing(), legKm, OVERPASS_CHUNK_KM, CHUNK_LEGS), MAX_IN_FLIGHT, async (part) => {
    if (deadline - Date.now() < 8000) return;
    await viaOverpass(pts, part, radius(Math.max(...part.map((i) => legKm[i]))), snapKm, deadline, paths).catch(() => {});
  });

  const line: LL[] = [];
  const approx: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const seg = paths[i] ?? [line[line.length - 1] ?? pts[i], pts[i + 1]];
    const start = Math.max(0, line.length - 1);
    for (const p of seg) {
      const last = line[line.length - 1];
      if (!last || last[0] !== p[0] || last[1] !== p[1]) line.push(p);
    }
    if (!paths[i]) {
      const end = line.length - 1;
      const prev = approx[approx.length - 1];
      if (prev && prev[1] >= start) prev[1] = end;
      else if (end > start) approx.push([start, end]);
    }
  }
  return { line, approx };
}
