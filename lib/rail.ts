import { Graph, hav, LL } from "./geo";
import type { Sight } from "@/data/routes";

const OP = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
export type Stop = { name: string; at: LL };

export async function pool<T, R>(items: T[], n: number, fn: (x: T, i: number) => Promise<R>) {
  const out: R[] = new Array(items.length); let k = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (k < items.length) { const i = k++; out[i] = await fn(items[i], i); } }));
  return out;
}
async function overpass(q: string) {
  for (let t = 0; t < 4; t++) {
    try {
      const r = await fetch(OP[t % 2], { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) });
      if (r.ok) return r.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 1500 * (t + 1)));
  }
  throw new Error("The OpenStreetMap track server is busy. Try again in a minute.");
}
export async function geocode(name: string): Promise<LL | null> {
  try {
    const r = await fetch(`https://photon.komoot.io/api/?limit=1&osm_tag=railway:station&q=${encodeURIComponent(name)}`);
    return (await r.json()).features?.[0]?.geometry?.coordinates ?? null;
  } catch { return null; }
}

// Fetch real rail geometry near the stops, then run shortest-path along the rails between consecutive stops.
export async function buildTrack(stops: Stop[], say: (s: string) => void) {
  const g = new Graph(), chunks: Stop[][] = [];
  for (let i = 0; i < stops.length - 1; i += 6) chunks.push(stops.slice(i, i + 7));
  let done = 0;
  await pool(chunks, 2, async (c) => {
    const around = c.map((s) => `${s.at[1]},${s.at[0]}`).join(",");
    const j = await overpass(`[out:json][timeout:90];way["railway"~"^(rail|narrow_gauge)$"][!"service"](around:3000,${around});out geom;`);
    j.elements.forEach((w: any) => g.addWay(w));
    say(`Fetched track data ${++done}/${chunks.length}`);
  });
  const line: LL[] = []; let bad = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = g.nearest(stops[i].at), b = g.nearest(stops[i + 1].at);
    let p: LL[] | null = null;
    if (a >= 0 && b >= 0 && hav(g.pts[a], stops[i].at) < 3 && hav(g.pts[b], stops[i + 1].at) < 3) p = g.path(a, b);
    if (!p) { bad++; p = [stops[i].at, stops[i + 1].at]; }
    line.push(...p);
  }
  return { line, bad };
}

const GOOD = /waterfall|lake|fort|hill|valley|beach|bridge|viaduct|tunnel|river|ghat|pass\b|national park|sanctuary|wildlife|mountain|peak|glacier|gorge|canyon|coast|island|reservoir|dam\b|lagoon|forest|cave|temple|palace|cliff|lighthouse/i;
const BAD = /\b(railway station|census town|village|suburb|junction)\b/i;

// Notable places near the track, from Wikipedia geosearch, ordered along the journey.
export async function findSights(line: LL[], say: (s: string) => void): Promise<Sight[]> {
  const total = line.reduce((s, p, i) => (i ? s + hav(line[i - 1], p) : 0), 0), step = Math.max(20, total / 30);
  const pts: LL[] = [line[0]]; let acc = 0;
  for (let i = 1; i < line.length; i++) { acc += hav(line[i - 1], line[i]); if (acc >= step) { pts.push(line[i]); acc = 0; } }
  const found = new Map<number, { s: Sight; o: number }>(); let n = 0;
  await pool(pts, 4, async (p, o) => {
    try {
      const u = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch&ggscoord=${encodeURIComponent(p[1] + "|" + p[0])}&ggsradius=10000&ggslimit=10&prop=pageimages|extracts|coordinates&piprop=thumbnail&pithumbsize=300&exintro=1&explaintext=1&exsentences=2&exlimit=max&colimit=max`;
      const pages = Object.values((await (await fetch(u)).json()).query?.pages ?? {}) as any[];
      for (const pg of pages) {
        const ex: string = pg.extract ?? "", c = pg.coordinates?.[0];
        if (!ex || !c || found.has(pg.pageid) || !GOOD.test(pg.title + " " + ex) || BAD.test(ex.slice(0, 90))) continue;
        found.set(pg.pageid, { o, s: { name: pg.title, at: [c.lon, c.lat], text: ex, tip: "From Wikipedia (CC BY-SA)", img: pg.thumbnail?.source, url: "https://en.wikipedia.org/?curid=" + pg.pageid } });
      }
    } catch {}
    say(`Finding sights ${++n}/${pts.length}`);
  });
  return [...found.values()].sort((a, b) => a.o - b.o).slice(0, 24).map((x) => x.s);
}
