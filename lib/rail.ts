import { hav, LL } from "./geo";
import { railUrl, type RailRoute } from "./railTrack";

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
  /** Reported (passed stops) or expected (upcoming) time, HH:MM IST. */
  actualArrival?: string;
  actualDeparture?: string;
  platform?: string;
};

/** Per-station running times from a reported live status, matched to stops by station code. */
export type StopTime = {
  code: string;
  actualArrival?: string;
  actualDeparture?: string;
  delayArrival?: number;
  delayDeparture?: number;
  platform?: string;
};

export type LiveTrainStatus = {
  trainNumber: string;
  trainName?: string;
  status: string; // 'running' | 'at-station' | 'not-started' | 'completed'
  isLive: boolean;
  /** Position worked out from the timetable, not reported by the train; delays are unknown. */
  estimated?: boolean;
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
    /** Direction of travel, degrees clockwise from north. */
    bearing?: number;
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

export const toMin = (t?: string) => {
  const m = t && /^(\d{1,2}):(\d{2})/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
export const fromMin = (n: number) => {
  const d = ((Math.round(n) % 1440) + 1440) % 1440;
  return `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`;
};
/** Minutes `b` is after `a`, across midnight; assumes the gap is under 12 hours either way. */
const diffMin = (a: number, b: number) => ((((b - a) % 1440) + 1440 + 720) % 1440) - 720;

export type TimePair = {
  sch: string;
  /** Reported or expected time; absent when only the timetable is known. */
  act?: string;
  delay?: number;
  kind: "actual" | "expected" | "scheduled";
};

function pair(sch: string | undefined, actual: string | undefined, stopDelay: number | undefined, passed: boolean, live?: LiveTrainStatus | null): TimePair | undefined {
  const s = toMin(sch);
  if (s === null) return undefined;
  const kind = passed ? "actual" : "expected";
  const a = toMin(actual);
  if (a !== null) return { sch: sch!, act: fromMin(a), delay: stopDelay ?? diffMin(s, a), kind };
  if (typeof stopDelay === "number") return { sch: sch!, act: fromMin(s + stopDelay), delay: stopDelay, kind };
  if (!passed && live && !live.estimated && live.status !== "completed") {
    const d = live.delayMinutes || 0;
    return { sch: sch!, act: fromMin(s + d), delay: d, kind: "expected" };
  }
  return { sch: sch!, kind: "scheduled" };
}

/** Scheduled vs actual/expected arrival and departure for a stop, with the delay in minutes. */
export function stopTiming(stop: Stop, live?: LiveTrainStatus | null): { arr?: TimePair; dep?: TimePair } {
  const passed = stop.status === "departed";
  return {
    arr: pair(stop.arrival, stop.actualArrival, stop.delayArrival, passed || (stop.status === "current" && live?.currentLocation?.stationCode === stop.code), live),
    dep: pair(stop.departure, stop.actualDeparture, stop.delayDeparture, passed, live),
  };
}

/** Day of the journey (1-based) and scheduled halt in minutes for each stop, from the timetable rolling past midnight. */
export function scheduleInfo(stops: Stop[]): { day: number; haltMin?: number }[] {
  let last = -1, wrap = 0;
  const roll = (t: number | null) => {
    if (t === null) return null;
    if (t + wrap < last) wrap += 1440;
    last = t + wrap;
    return last;
  };
  return stops.map((s) => {
    const arr = roll(toMin(s.arrival));
    const dep = roll(toMin(s.departure));
    const at = arr ?? dep;
    return {
      day: at === null ? Math.floor(wrap / 1440) + 1 : Math.floor(at / 1440) + 1,
      haltMin: arr !== null && dep !== null ? dep - arr : undefined,
    };
  });
}

/** Mark stops departed / current (next halt) / upcoming from the train's position. */
export function markStops(stops: Stop[], live: LiveTrainStatus | null | undefined): Stop[] {
  const km = live?.currentLocation?.distanceFromOriginKm;
  if (!live || km === undefined) return stops;
  return stops.map((h) => ({
    ...h,
    status:
      h.distance !== undefined && h.distance < km ? "departed"
      : h.code && h.code === live.nextHalt?.stationCode ? "current"
      : "upcoming",
  }));
}

/** Apply reported per-station times to the stops. */
export function mergeStopTimes(stops: Stop[], times: StopTime[] | undefined): Stop[] {
  if (!times?.length) return stops;
  const byCode = new Map(times.map((t) => [t.code, t]));
  return stops.map((s) => {
    const t = s.code ? byCode.get(s.code) : undefined;
    if (!t) return s;
    return {
      ...s,
      actualArrival: t.actualArrival ?? s.actualArrival,
      actualDeparture: t.actualDeparture ?? s.actualDeparture,
      delayArrival: t.delayArrival ?? s.delayArrival,
      delayDeparture: t.delayDeparture ?? s.delayDeparture,
      platform: t.platform ?? s.platform,
    };
  });
}

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

/** `country` is an ISO code; India's station list is used when it's absent. */
export async function geocodeStop(name: string, country?: string): Promise<Stop | null> {
  try {
    const r = await tfetch(`/api/train?station=${encodeURIComponent(name)}${country ? `&c=${country}` : ""}`, {}, 10000);
    if (!r.ok) return null;
    return (await r.json()).stop ?? null;
  } catch { return null; }
}

export async function geocode(name: string): Promise<LL | null> {
  const s = await geocodeStop(name);
  return s?.at ?? null;
}

/** Route through `points` on real railway track; null if the server couldn't be reached. */
export async function traceRail(points: LL[], snapKm?: number): Promise<RailRoute | null> {
  try {
    const r = await tfetch(railUrl(points, snapKm), {}, 60000);
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j?.line) && j.line.length >= 2 ? { line: j.line, approx: Array.isArray(j.approx) ? j.approx : [] } : null;
  } catch {
    return null;
  }
}

/** Track line through the stops; `bad` counts stretches drawn straight for lack of track data. */
export async function buildTrack(stops: Stop[], say: (s: string) => void) {
  say("Tracing the rail track…");
  const pts = stops.map((s) => s.at);
  const r = await traceRail(pts);
  if (r) return { line: r.line, approx: r.approx, bad: r.approx.length };
  return { line: pts, approx: [[0, pts.length - 1]] as [number, number][], bad: pts.length - 1 };
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
