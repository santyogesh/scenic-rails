export type LL = [number, number]; // [lng, lat]
export const hav = (a: LL, b: LL) => {
  const r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h)); // km
};
type Way = { id: number; nodes: number[]; geometry?: { lat: number; lon: number }[] };

// Track graph built from OpenStreetMap railway ways; routes follow the rails.
export class Graph {
  idx = new Map<number, number>(); pts: LL[] = []; adj: [number, number][][] = []; seen = new Set<number>();
  private add(id: number, p: LL) {
    let i = this.idx.get(id);
    if (i === undefined) { i = this.pts.length; this.idx.set(id, i); this.pts.push(p); this.adj.push([]); }
    return i;
  }
  addWay(w: Way) {
    if (this.seen.has(w.id) || !w.geometry) return;
    this.seen.add(w.id);
    let prev = -1;
    w.nodes.forEach((n, k) => {
      const g = w.geometry![k]; if (!g) return;
      const i = this.add(n, [g.lon, g.lat]);
      if (prev >= 0 && prev !== i) { const d = hav(this.pts[prev], this.pts[i]); this.adj[prev].push([i, d]); this.adj[i].push([prev, d]); }
      prev = i;
    });
  }
  nearest(p: LL) {
    let b = -1, bd = Infinity;
    this.pts.forEach((q, i) => { const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2; if (d < bd) { bd = d; b = i; } });
    return b;
  }
  path(s: number, t: number): LL[] | null {
    const n = this.pts.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1);
    const h: [number, number][] = [[0, s]]; dist[s] = 0;
    const up = (i: number) => { while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
    const down = (i: number) => { for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } };
    while (h.length) {
      const top = h[0], last = h.pop()!;
      if (h.length) { h[0] = last; down(0); }
      const [d, u] = top;
      if (d > dist[u]) continue;
      if (u === t) break;
      for (const [v, w] of this.adj[u]) { const nd = d + w; if (nd < dist[v]) { dist[v] = nd; prev[v] = u; h.push([nd, v]); up(h.length - 1); } }
    }
    if (dist[t] === Infinity) return null;
    const out: LL[] = [];
    for (let c = t; c !== -1; c = prev[c]) out.push(this.pts[c]);
    return out.reverse();
  }
}
