import { hav, LL } from "./geo";

export type Sight = { name: string; at: LL; text: string; img?: string; url?: string };
export type Stop = {
  name: string;
  code?: string;
  at: LL;
  arrival?: string;
  departure?: string;
  distance?: number;
  sequence?: number;
  status?: string; // 'departed' | 'current' | 'upcoming'
  delayArrival?: number;
  delayDeparture?: number;
  platform?: string;
};

export type LiveTrainStatus = {
  trainNumber: string;
  trainName?: string;
  status: string; // 'running' | 'at-station' | 'not-started' | 'completed'
  isLive: boolean;
  delayMinutes: number;
  lastUpdatedAt: string;
  currentLocation?: {
    stationName?: string;
    stationCode?: string;
    status?: string;
    coordinates?: { lat: number; lng: number };
    at?: LL;
    distanceFromOriginKm?: number;
    delayMinutes?: number;
    speedKmh?: number;
    segmentProgress?: number;
  };
  previousHalt?: {
    stationName?: string;
    stationCode?: string;
    distance?: number;
    sequence?: number;
    departure?: string;
  };
  nextHalt?: {
    stationName?: string;
    stationCode?: string;
    distance?: number;
    sequence?: number;
    scheduledArrival?: string;
    expectedArrival?: string;
    platform?: string;
    delayArrival?: number;
  };
  totalDistance?: number;
};

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

export async function geocodeStop(name: string): Promise<Stop | null> {
  try {
    const r = await tfetch(`/api/train?station=${encodeURIComponent(name)}`, {}, 10000);
    if (!r.ok) return null;
    return (await r.json()).stop ?? null;
  } catch { return null; }
}

export async function geocode(name: string): Promise<LL | null> {
  const s = await geocodeStop(name);
  return s?.at ?? null;
}

// Fetch RailRadar GIS rail track geometry between consecutive stops.
export async function buildTrack(stops: Stop[], say: (s: string) => void) {
  const legs = stops.slice(0, -1).map((s, i) => [s, stops[i + 1]] as const);
  let done = 0, bad = 0;
  const segments = await pool(legs, 3, async ([a, b]) => {
    try {
      const r = await tfetch(`/api/train?from=${encodeURIComponent(a.name)}&to=${encodeURIComponent(b.name)}`, {}, 15000);
      const j = r.ok ? await r.json() : null;
      say(`Downloading RailRadar tracks ${++done}/${legs.length}`);
      if (Array.isArray(j?.line) && j.line.length >= 2) return j.line as LL[];
    } catch {
      say(`Downloading RailRadar tracks ${++done}/${legs.length}`);
    }
    bad++;
    return [a.at, b.at] as LL[];
  });
  return { line: segments.flat(), bad };
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
