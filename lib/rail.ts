import { Graph, hav, LL } from "./geo";

export type Sight = { name: string; at: LL; text: string; img?: string; url?: string };
export type Stop = { name: string; at: LL };
const OP = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

// Every network call has a timeout so the UI can never hang.
async function tfetch(u: string, init: RequestInit = {}, ms = 15000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try { return await fetch(u, { ...init, signal: c.signal }); } finally { clearTimeout(t); }
}
export async function pool<T, R>(items: T[], n: number, fn: (x: T, i: number) => Promise<R>) {
  const out: R[] = new Array(items.length); let k = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (k < items.length) { const i = k++; out[i] = await fn(items[i], i); } }));
  return out;
}
async function overpass(q: string) {
  for (let t = 0; t < 4; t++) {
    try {
      const r = await tfetch(OP[t % 2], { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) }, 45000);
      if (r.ok) return r.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 1500 * (t + 1)));
  }
  throw new Error("The OpenStreetMap track server is busy. Try again in a minute.");
}
export async function geocode(name: string): Promise<LL | null> {
  try {
    const r = await tfetch(`https://photon.komoot.io/api/?limit=1&osm_tag=railway:station&q=${encodeURIComponent(name)}`, {}, 10000);
    return (await r.json()).features?.[0]?.geometry?.coordinates ?? null;
  } catch { return null; }
}

// Real OSM rail ways, then shortest path along the rails between consecutive stops.
export async function buildTrack(stops: Stop[], say: (s: string) => void) {
  const g = new Graph(), chunks: Stop[][] = [];
  for (let i = 0; i < stops.length - 1; i += 6) chunks.push(stops.slice(i, i + 7));
  let done = 0;
  await pool(chunks, 2, async (c) => {
    const leg = Math.max(...c.slice(1).map((s, i) => hav(s.at, c[i].at)));
    const rad = Math.round(Math.max(3000, Math.min(15000, leg * 60)));
    const around = c.map((s) => `${s.at[1]},${s.at[0]}`).join(",");
    const j = await overpass(`[out:json][timeout:40];way["railway"~"^(rail|narrow_gauge)$"][!"service"](around:${rad},${around});out geom;`);
    j.elements.forEach((w: any) => g.addWay(w));
    say(`Downloading rail tracks ${++done}/${chunks.length}`);
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

export async function findSights(line: LL[], say: (s: string) => void): Promise<Sight[]> {
  const total = line.reduce((s, p, i) => (i ? s + hav(line[i - 1], p) : 0), 0), step = Math.max(20, total / 30);
  const pts: LL[] = [line[0]]; let acc = 0;
  for (let i = 1; i < line.length; i++) { acc += hav(line[i - 1], line[i]); if (acc >= step) { pts.push(line[i]); acc = 0; } }
  const found = new Map<number, { s: Sight; o: number }>(); let n = 0;
  await pool(pts, 4, async (p, o) => {
    try {
      const u = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch&ggscoord=${encodeURIComponent(p[1] + "|" + p[0])}&ggsradius=10000&ggslimit=10&prop=pageimages|extracts|coordinates&piprop=thumbnail&pithumbsize=600&exintro=1&explaintext=1&exsentences=2&exlimit=max&colimit=max`;
      const pages = Object.values((await (await tfetch(u, {}, 12000)).json()).query?.pages ?? {}) as any[];
      for (const pg of pages) {
        const ex: string = pg.extract ?? "", c = pg.coordinates?.[0];
        if (!ex || !c || found.has(pg.pageid) || !GOOD.test(pg.title + " " + ex) || BAD.test(ex.slice(0, 90))) continue;
        found.set(pg.pageid, { o, s: { name: pg.title, at: [c.lon, c.lat], text: ex, img: pg.thumbnail?.source, url: "https://en.wikipedia.org/?curid=" + pg.pageid } });
      }
    } catch {}
    say(`Finding scenic spots ${++n}/${pts.length}`);
  });
  return [...found.values()].sort((a, b) => a.o - b.o).slice(0, 24).map((x) => x.s);
}

// Photos taken near a sight, from Wikimedia Commons.
export async function photos(s: Sight): Promise<string[]> {
  try {
    const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch&ggsnamespace=6&ggscoord=${encodeURIComponent(s.at[1] + "|" + s.at[0])}&ggsradius=2000&ggslimit=14&prop=imageinfo&iiprop=url&iiurlwidth=900`;
    const pages = Object.values((await (await tfetch(u, {}, 12000)).json()).query?.pages ?? {}) as any[];
    const imgs = pages.map((p) => p.imageinfo?.[0]?.thumburl as string).filter((x) => x && /\.jpe?g$/i.test(x));
    return [...new Set([s.img, ...imgs].filter(Boolean) as string[])].slice(0, 8);
  } catch { return s.img ? [s.img] : []; }
}
