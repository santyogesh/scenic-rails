import { hav, type LL } from "./geo";
import type { Stop } from "./rail";
import { UA } from "./overpass";
import { cacheGet, cacheKey, cacheSet } from "./cache";
import { hhmmIn, startOfDay, type TrainQuery } from "./countries";

// Transitous (transitous.org): a community-run MOTIS server over open GTFS feeds worldwide. No key; keep requests light.
const API = "https://api.transitous.org/api/v1";
const LONG_DISTANCE = "HIGHSPEED_RAIL,LONG_DISTANCE,NIGHT_RAIL";
const ANY_RAIL = `${LONG_DISTANCE},REGIONAL_FAST_RAIL,REGIONAL_RAIL`;
/** Metres around a stop whose departures count too: big stations are split into several stops across feeds. */
const STATION_RADIUS_M = 400;
const STOP_CACHE_SEC = 7 * 86400;
const RAIL_MODE = /RAIL|LONG_DISTANCE|SUBURBAN/;

export type TransitousStop = { id: string; name: string; at: LL; country?: string; tz?: string };

const memory = new Map<string, { data: unknown; expiry: number }>();
async function get<T>(path: string, ttlMs: number, ms = 15000): Promise<T> {
  const hit = memory.get(path);
  if (hit && hit.expiry > Date.now()) return hit.data as T;
  const r = await fetch(API + path, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`transitous ${r.status}`);
  const data = (await r.json()) as T;
  if (memory.size > 500) memory.clear();
  memory.set(path, { data, expiry: Date.now() + ttlMs });
  return data;
}

/** Stops matching `text`, in `country` when any are there. */
export async function geocodeStops(text: string, country: string): Promise<TransitousStop[]> {
  const ck = cacheKey("tr", `geo:${country}:${text.toLowerCase()}`);
  const cached = await cacheGet<TransitousStop[]>(ck);
  if (cached) return cached;
  const rows = await get<any[]>(`/geocode?${new URLSearchParams({ text, type: "STOP" })}`, 3600000, 10000);
  const all = (Array.isArray(rows) ? rows : [])
    .filter((x) => x?.type === "STOP" && Number.isFinite(x.lat) && Number.isFinite(x.lon))
    .map((x): TransitousStop & { rail: boolean } => ({
      id: x.id,
      name: x.name,
      at: [x.lon, x.lat],
      country: x.country,
      tz: x.tz,
      rail: Array.isArray(x.modes) && x.modes.some((m: unknown) => typeof m === "string" && RAIL_MODE.test(m)),
    }));
  // Stations served by trains first; the geocoder's own ranking otherwise.
  const out: TransitousStop[] = all
    .filter((x) => x.country === country)
    .sort((a, b) => Number(b.rail) - Number(a.rail))
    .map(({ rail: _, ...s }) => s);
  if (out.length) await cacheSet(ck, out, STOP_CACHE_SEC);
  return out;
}

const norm = (s: string) => s.replace(/[\s.\-]/g, "").toUpperCase();
const numTokens = (s: string) => (s.match(/\d+[A-Za-z]?/g) ?? []).map((t) => t.replace(/^0+(?=\d)/, "").toUpperCase());

/** How well a departure matches the train number: 3 exact name, 2 trip number, 1 number in the display name; 0 no match. */
function score(st: any, q: TrainQuery): number {
  const names: string[] = [st.tripShortName, st.displayName, st.routeShortName].filter((x) => typeof x === "string" && x);
  const want = `${q.prefix}${q.num}${q.suffix}`;
  if (names.some((n) => norm(n) === want)) return 3;
  const num = `${q.num}${q.suffix}`;
  const prefixOk = !q.prefix || names.some((n) => n.toUpperCase().includes(q.prefix));
  if (!prefixOk) return 0;
  if (numTokens(st.tripShortName ?? "").includes(num)) return 2;
  if (!st.tripShortName && numTokens(st.displayName ?? "").includes(num)) return 1;
  return 0;
}

/** The trip id of the train numbered `q` that calls at one of `stopIds` on `date` (YYYY-MM-DD, in `tz`). */
export async function findTrip(q: TrainQuery, stopIds: string[], date: string, tz: string): Promise<string | null> {
  const dayStart = startOfDay(date, tz);
  const day = date.replace(/-/g, "");
  const board = (stopId: string, mode: string, arrivals: boolean) =>
    get<any>(
      `/stoptimes?${new URLSearchParams({
        stopId,
        // Arrivals are searched backwards from the end of the day (plus the small hours, for overnight trains).
        time: new Date(arrivals ? dayStart + 30 * 3600000 : dayStart).toISOString(),
        n: "400",
        radius: String(STATION_RADIUS_M),
        mode,
        ...(arrivals ? { arriveBy: "true" } : {}),
      })}`,
      10 * 60000,
      20000
    )
      .then((j) => (Array.isArray(j?.stopTimes) ? (j.stopTimes as any[]) : []))
      .catch(() => [] as any[]);
  // Departures and arrivals both: a train that ends at a hub isn't on its departure board.
  const passes = [
    () => stopIds.flatMap((id) => [board(id, LONG_DISTANCE, false), board(id, LONG_DISTANCE, true)]),
    () => stopIds.map((id) => board(id, ANY_RAIL, false)),
  ];
  for (const pass of passes) {
    const lists = await Promise.all(pass());
    let best: { id: string; rank: number } | null = null;
    for (const st of lists.flat()) {
      const s = score(st, q);
      if (!s || typeof st.tripId !== "string") continue;
      const rank = s * 2 + (st.tripId.startsWith(day) ? 1 : 0);
      if (!best || rank > best.rank) best = { id: st.tripId, rank };
    }
    if (best) return best.id;
  }
  return null;
}

/** Google encoded polyline; MOTIS uses precision 7 for leg geometry. */
export function decodePolyline(str: string, precision = 7): LL[] {
  const f = 10 ** precision, out: LL[] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const k of [0, 1]) {
      let b, shift = 0, res = 0;
      do {
        b = str.charCodeAt(i++) - 63;
        res |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && i < str.length);
      const d = res & 1 ? ~(res >> 1) : res >> 1;
      if (k === 0) lat += d;
      else lng += d;
    }
    out.push([lng / f, lat / f]);
  }
  return out;
}

/** Drop points closer than `km` to the last kept one; track shapes come with a point every few metres. */
function thin(line: LL[], km: number): LL[] {
  if (line.length < 3) return line;
  const out: LL[] = [line[0]];
  for (let i = 1; i < line.length - 1; i++) if (hav(out[out.length - 1], line[i]) >= km) out.push(line[i]);
  out.push(line[line.length - 1]);
  return out;
}

export type TransitousTrain = {
  tripId: string;
  number: string;
  name: string;
  operator?: string;
  /** Timezone the stop times are written in (the origin's). */
  tz: string;
  realTime: boolean;
  stops: Stop[];
  line: LL[];
  distance: number;
  /** Minutes, origin departure to destination arrival. */
  duration: number;
};

/** Full timetable, geometry and (where the feed has it) real-time times for a trip. */
export async function tripDetails(tripId: string, fallbackTz: string): Promise<TransitousTrain | null> {
  const j = await get<any>(`/trip?${new URLSearchParams({ tripId })}`, 60000, 15000);
  const leg = j?.legs?.[0];
  if (!leg?.from || !leg?.to) return null;
  const tz: string = leg.from.tz ?? fallbackTz;
  const places: any[] = [leg.from, ...(Array.isArray(leg.intermediateStops) ? leg.intermediateStops : []), leg.to];
  const t = (v: unknown) => (typeof v === "string" && Number.isFinite(Date.parse(v)) ? Date.parse(v) : null);
  const hm = (ms: number | null) => (ms === null ? undefined : hhmmIn(ms, tz));
  const delay = (act: number | null, sch: number | null) => (leg.realTime && act !== null && sch !== null ? Math.round((act - sch) / 60000) : undefined);

  let km = 0;
  const stops: Stop[] = places
    .filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lon) && p?.name)
    .map((p, i, arr) => {
      const at: LL = [p.lon, p.lat];
      if (i) km += hav([arr[i - 1].lon, arr[i - 1].lat], at);
      const sa = t(p.scheduledArrival ?? (i === arr.length - 1 ? p.arrival : null)), sd = t(p.scheduledDeparture ?? (i === 0 ? p.departure : null));
      const aa = t(p.arrival), ad = t(p.departure);
      return {
        name: p.name,
        code: p.stopId ?? `${p.name}#${i}`,
        at,
        arrival: i === 0 ? undefined : hm(sa),
        departure: i === arr.length - 1 ? undefined : hm(sd),
        distance: Math.round(km),
        sequence: i + 1,
        actualArrival: leg.realTime && i > 0 ? hm(aa) : undefined,
        actualDeparture: leg.realTime && i < arr.length - 1 ? hm(ad) : undefined,
        delayArrival: i > 0 ? delay(aa, sa) : undefined,
        delayDeparture: i < arr.length - 1 ? delay(ad, sd) : undefined,
        platform: p.track ?? p.scheduledTrack ?? undefined,
      };
    });
  if (stops.length < 2) return null;

  const geom = leg.legGeometry;
  const decoded = typeof geom?.points === "string" ? thin(decodePolyline(geom.points, Number(geom.precision) || 7), 0.05) : [];
  const start = t(leg.scheduledStartTime ?? leg.startTime), end = t(leg.scheduledEndTime ?? leg.endTime);
  return {
    tripId,
    number: leg.tripShortName || leg.displayName || leg.routeShortName || "",
    name: leg.displayName || leg.routeShortName || "",
    operator: leg.agencyName || undefined,
    tz,
    realTime: Boolean(leg.realTime),
    stops,
    line: decoded.length >= 2 ? decoded : stops.map((s) => s.at),
    distance: Math.round(km),
    duration: start !== null && end !== null ? Math.round((end - start) / 60000) : 0,
  };
}
