import type { LL } from "@/lib/geo";
import { markStops, type LiveTrainStatus, type Stop, type StopTime } from "@/lib/rail";
import { popularTrains, computeLiveStatusFromSchedule } from "@/data/popularTrains";
import { erailTrain } from "@/lib/erail";
import { findStation } from "@/lib/stations";
import { isCountry } from "@/lib/countries";
import { geocodeStops } from "@/lib/transitous";
import { UA as OSM_UA } from "@/lib/overpass";

const BASE = "https://api.railradar.in/v1";

// In-memory cache to minimize RailRadar quota usage
const cache = new Map<string, { data: any; expiry: number }>();

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.data as T;
}

function setCache(key: string, data: any, ttlMs: number) {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

function unavailable(no: string, quota: boolean) {
  return Response.json(
    {
      error: quota
        ? `Couldn't load train ${no}: the timetable source didn't answer and the RailRadar quota is used up. Try again in a minute, or enter the stations instead.`
        : `Couldn't load train ${no}. Check the number, try again in a minute, or enter the stations instead.`,
    },
    { status: 503 }
  );
}

const LIVE_CACHE_MS = 5 * 60000;

function toLiveStatus(d: any, no: string): LiveTrainStatus | null {
  if (!d) return null;
  const c = d.currentLocation;
  const lat = c?.coordinates?.lat, lng = c?.coordinates?.lng;
  return {
    trainNumber: d.trainNumber || no,
    trainName: d.trainName,
    status: d.status || (d.isLive ? "running" : "unknown"),
    isLive: Boolean(d.isLive),
    delayMinutes: typeof d.delayMinutes === "number" ? d.delayMinutes : 0,
    lastUpdatedAt: d.lastUpdatedAt || new Date().toISOString(),
    currentLocation: c
      ? {
          stationName: c.stationName,
          stationCode: c.stationCode,
          status: c.status,
          coordinates: c.coordinates,
          at: typeof lng === "number" && typeof lat === "number" ? ([lng, lat] as LL) : undefined,
          distanceFromOriginKm: c.distanceFromOriginKm,
          delayMinutes: c.delayMinutes,
          speedKmh: c.speedKmh,
          segmentProgress: c.segmentProgress,
          bearing: typeof c.bearing === "number" ? c.bearing : undefined,
        }
      : undefined,
    previousHalt: d.previousHalt,
    nextHalt: d.nextHalt,
  };
}

const withStatus = (halts: Stop[], live: LiveTrainStatus) => markStops(halts, live);

/** A RailRadar time (HH:MM, ISO date-time, or epoch seconds/ms) as HH:MM in IST. */
function toHHMM(v: unknown): string | undefined {
  if (typeof v === "string") {
    const m = /^(\d{1,2}):(\d{2})/.exec(v.trim());
    if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  }
  const ms = typeof v === "number" ? (v > 1e12 ? v : v > 1e9 ? v * 1000 : NaN) : typeof v === "string" ? Date.parse(v) : NaN;
  return Number.isFinite(ms) ? new Date(ms + 5.5 * 3600000).toISOString().slice(11, 16) : undefined;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined);

/** Per-station reported/expected times from RailRadar's live route. Field names aren't documented, so try the likely ones. */
function liveStopTimes(route: unknown): StopTime[] {
  if (!Array.isArray(route)) return [];
  return route
    .map((st: any): StopTime | null => {
      const code = st?.stationCode ?? st?.station?.code;
      if (typeof code !== "string" || !code) return null;
      return {
        code,
        actualArrival: toHHMM(st.actualArrival ?? st.expectedArrival ?? st.arrival?.actual ?? st.arrival?.expected),
        actualDeparture: toHHMM(st.actualDeparture ?? st.expectedDeparture ?? st.departure?.actual ?? st.departure?.expected),
        delayArrival: num(st.delayArrival ?? st.arrivalDelay ?? st.arrival?.delay),
        delayDeparture: num(st.delayDeparture ?? st.departureDelay ?? st.departure?.delay),
        platform: typeof st.platform === "string" || typeof st.platform === "number" ? String(st.platform) : undefined,
      };
    })
    .filter((t): t is StopTime => Boolean(t));
}

/** Timetable for estimating the position: erail.in first, then the built-in trains. */
async function schedule(no: string) {
  const e = await erailTrain(no).catch(() => null);
  if (e) return { number: no, name: popularTrains[no]?.name ?? `${e.from} - ${e.to} ${e.type}`.trim(), halts: e.stops, distance: e.distance };
  const p = popularTrains[no];
  return p ? { number: no, name: p.name, halts: p.halts, distance: p.distance } : null;
}

function getHeaders() {
  const key = process.env.RAILRADAR_API_KEY ?? "";
  return {
    Authorization: `Bearer ${key}`,
    "X-Api-Key": key,
    Accept: "application/json",
  };
}

const dist2 = (a: LL, b: LL) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

function sliceLine(coords: LL[], startPt: LL, endPt: LL): LL[] {
  if (coords.length < 2) return [];
  let i0 = 0,
    i1 = 0,
    d0 = Infinity,
    d1 = Infinity;
  coords.forEach((p, idx) => {
    const da = dist2(p, startPt),
      db = dist2(p, endPt);
    if (da < d0) {
      d0 = da;
      i0 = idx;
    }
    if (db < d1) {
      d1 = db;
      i1 = idx;
    }
  });
  return i0 <= i1 ? coords.slice(i0, i1 + 1) : coords.slice(i1, i0 + 1).reverse();
}

async function searchStation(q: string) {
  const cacheKey = `station_${q.toLowerCase()}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;
  const local = findStation(q);
  if (local) return local;

  try {
    const r = await fetch(`${BASE}/lookup/search/stations?q=${encodeURIComponent(q)}&limit=1`, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    if (r.ok) {
      const j = await r.json();
      const s = j?.data?.[0];
      if (s && typeof s.lng === "number" && typeof s.lat === "number") {
        const res = { name: s.name as string, code: s.code as string, at: [s.lng, s.lat] as LL };
        setCache(cacheKey, res, 86400000);
        return res;
      }
    }
  } catch {}

  // Fallback to known station coordinates if RailRadar quota is reached
  for (const t of Object.values(popularTrains)) {
    const match = t.halts.find(h => h.name.toLowerCase().includes(q.toLowerCase()) || (h.code && h.code.toLowerCase() === q.toLowerCase()));
    if (match) {
      return { name: match.name, code: match.code || "", at: match.at };
    }
  }
  return null;
}

const PHOTON = "https://photon.komoot.io/api/";

async function intlStation(q: string, country: string): Promise<{ name: string; code: string; at: LL } | null> {
  const cacheKey = `station_${country}_${q.toLowerCase()}`;
  const cached = getCached<{ name: string; code: string; at: LL }>(cacheKey);
  if (cached) return cached;
  let res: { name: string; code: string; at: LL } | null = null;
  try {
    const s = (await geocodeStops(q, country))[0];
    if (s) res = { name: s.name, code: s.id, at: s.at };
  } catch {}
  if (!res) {
    try {
      const sp = new URLSearchParams({ q, limit: "10" });
      for (const tag of ["railway:station", "railway:halt", "public_transport:station"]) sp.append("osm_tag", tag);
      const r = await fetch(`${PHOTON}?${sp}`, { headers: { "User-Agent": OSM_UA }, signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const f = ((await r.json())?.features ?? []).find((x: any) => x?.properties?.countrycode?.toUpperCase() === country);
        const [lng, lat] = f?.geometry?.coordinates ?? [];
        if (typeof lng === "number" && typeof lat === "number") res = { name: f.properties.name ?? q, code: `osm${f.properties.osm_id ?? ""}`, at: [lng, lat] };
      }
    } catch {}
  }
  if (res) setCache(cacheKey, res, 86400000);
  return res;
}

async function fetchTrainRouteCoords(trainNo: string): Promise<LL[]> {
  const cacheKey = `route_coords_${trainNo}`;
  const cached = getCached<LL[]>(cacheKey);
  if (cached) return cached;

  try {
    const r = await fetch(`${BASE}/trains/${encodeURIComponent(trainNo)}/route`, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(15000),
    });
    if (r.ok) {
      const j = await r.json();
      const coords = j?.data?.geojson?.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        setCache(cacheKey, coords, 86400000);
        return coords as LL[];
      }
    }
  } catch {}

  return popularTrains[trainNo]?.line || [];
}


export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const stationQuery = sp.get("station")?.trim();
  const fromQuery = sp.get("from")?.trim();
  const toQuery = sp.get("to")?.trim();
  if ([stationQuery, fromQuery, toQuery].some((s) => s && s.length > 100)) {
    return Response.json({ error: "Station name is too long." }, { status: 400 });
  }

  // 1. Station search: RailRadar in India; Transitous, then Photon (OpenStreetMap) elsewhere
  if (stationQuery) {
    const c = (sp.get("c") ?? "IN").toUpperCase();
    try {
      const stop = c === "IN" || !isCountry(c) ? await searchStation(stationQuery) : await intlStation(stationQuery, c);
      if (!stop) return Response.json({ error: "Station not found." }, { status: 404 });
      return Response.json({ stop });
    } catch {
      return Response.json({ error: "Station lookup failed." }, { status: 502 });
    }
  }

  // 2. Track geometry between two stations via RailRadar
  if (fromQuery && toQuery) {
    try {
      const [fromSt, toSt] = await Promise.all([searchStation(fromQuery), searchStation(toQuery)]);
      if (!fromSt || !toSt) return Response.json({ line: [] });
      const r = await fetch(
        `${BASE}/trains/between/${encodeURIComponent(fromSt.code)}/${encodeURIComponent(toSt.code)}?byCity=true`,
        { headers: getHeaders(), signal: AbortSignal.timeout(15000) }
      );
      if (!r.ok) return Response.json({ line: [] });
      const j = await r.json();
      const tNo = j?.data?.trains?.[0]?.train?.number;
      if (!tNo) return Response.json({ line: [] });
      const coords = await fetchTrainRouteCoords(tNo);
      const line = sliceLine(coords, fromSt.at, toSt.at);
      return Response.json({ line });
    } catch {
      return Response.json({ line: [] });
    }
  }

  // 3. Train number lookup + GIS route + Live running status via RailRadar
  const no = (sp.get("no") ?? "").replace(/\D/g, "");
  if (!no) return Response.json({ error: "Enter a train number." }, { status: 400 });
  if (no.length > 6) return Response.json({ error: "Train numbers have at most 6 digits." }, { status: 400 });

  // Journey start date (IST, YYYY-MM-DD); only today and the previous few days are accepted.
  const rawDate = sp.get("date") ?? "";
  const daysAgo = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
    ? Math.round((Date.parse(new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10)) - Date.parse(rawDate)) / 86400000)
    : NaN;
  const startDate = daysAgo >= 0 && daysAgo <= 5 ? rawDate : undefined;
  const liveUrl = `${BASE}/trains/${encodeURIComponent(no)}/live?includeCoordinates=true${startDate ? `&date=${startDate}` : ""}`;

  // Position polling. RailRadar's real position costs quota (100 requests/month), so it's only fetched when the
  // user asks for it (real=1) and shared for 5 minutes; otherwise the position is estimated from the timetable.
  if (sp.get("liveOnly") === "1") {
    if (sp.get("real") === "1") {
      const key = `live_${no}_${startDate ?? ""}`;
      const cached = getCached<{ liveStatus: LiveTrainStatus; stopTimes: StopTime[] }>(key);
      if (cached) return Response.json(cached);
      try {
        const rLive = await fetch(liveUrl, { headers: getHeaders(), signal: AbortSignal.timeout(10000) });
        const d = rLive.ok ? (await rLive.json())?.data : null;
        const liveStatus = toLiveStatus(d, no);
        if (liveStatus) {
          const body = { liveStatus, stopTimes: liveStopTimes(d?.route) };
          setCache(key, body, LIVE_CACHE_MS);
          return Response.json(body);
        }
      } catch {}
    }
    const sched = await schedule(no);
    if (!sched) return Response.json({ liveStatus: null }, { status: 503 });
    return Response.json({ liveStatus: computeLiveStatusFromSchedule(sched, startDate) });
  }

  // Timetable and stops from erail.in (no quota); RailRadar below is only the fallback.
  const e = await erailTrain(no).catch(() => null);
  if (e) {
    const p = popularTrains[no];
    const name = p?.name ?? `${e.from} - ${e.to} ${e.type}`.trim();
    const liveStatus = computeLiveStatusFromSchedule({ number: no, name, halts: e.stops, distance: e.distance }, startDate);
    const stops = e.stops.map((s) => s.name);
    return Response.json({
      stops,
      stationStops: withStatus(e.stops, liveStatus),
      line: p?.line ?? e.stops.map((s) => s.at),
      waypoints: e.stops.map((s) => s.at),
      title: `${name} (${no})`,
      place: `${stops[0]} to ${stops[stops.length - 1]}`,
      distance: e.distance ? `${e.distance} km` : "",
      duration: e.duration ? `${Math.floor(e.duration / 60)}h ${e.duration % 60}m` : "",
      liveStatus,
    });
  }

  try {
    const [rTrain, coords, rLive] = await Promise.all([
      fetch(`${BASE}/trains/${encodeURIComponent(no)}`, {
        headers: getHeaders(),
        signal: AbortSignal.timeout(15000),
      }).catch(() => null),
      fetchTrainRouteCoords(no),
      fetch(liveUrl, {
        headers: getHeaders(),
        signal: AbortSignal.timeout(12000),
      }).catch(() => null),
    ]);

    if (rTrain && rTrain.ok) {
      const j = await rTrain.json();
      const rawRoute: any[] = Array.isArray(j?.data?.route) ? j.data.route : [];
      const halts = rawRoute.filter((x) => x?.isHalt && x?.station?.name);
      const chosen = halts.length >= 2 ? halts : rawRoute.filter((x) => x?.station?.name);

      const stops = chosen.map((x) => x.station.name as string).filter(Boolean);
      if (stops.length >= 2) {
        let liveStatus = null;
        const liveRouteMap = new Map<string, StopTime>();

        if (rLive && rLive.ok) {
          try {
            const jLive = await rLive.json();
            const d = jLive?.data;
            if (d) {
              liveStatus = toLiveStatus(d, no);
              for (const t of liveStopTimes(d.route)) liveRouteMap.set(t.code, t);
            }
          } catch {}
        }

        const stationStops = chosen
          .filter((x) => typeof x.station?.lng === "number" && typeof x.station?.lat === "number")
          .map((x) => {
            const liveInfo = liveRouteMap.get(x.station.code);
            return {
              name: x.station.name as string,
              code: x.station.code as string,
              at: [x.station.lng, x.station.lat] as LL,
              arrival: x.arrival as string | undefined,
              departure: x.departure as string | undefined,
              distance: typeof x.distance === "number" ? Math.round(x.distance) : undefined,
              sequence: x.sequence as number | undefined,
              delayArrival: liveInfo?.delayArrival,
              delayDeparture: liveInfo?.delayDeparture,
              actualArrival: liveInfo?.actualArrival,
              actualDeparture: liveInfo?.actualDeparture,
              platform: liveInfo?.platform,
            };
          });

        const waypoints: LL[] = rawRoute
          .filter((x) => typeof x?.station?.lng === "number" && typeof x?.station?.lat === "number")
          .map((x) => [x.station.lng, x.station.lat] as LL);

        const line = coords.length >= 2 ? coords : waypoints;
        const trainInfo = j?.data?.train;
        const title = trainInfo?.name
          ? `${trainInfo.name} (${trainInfo.number || no})`
          : `${stops[0]} to ${stops[stops.length - 1]}`;
        const place = `${stops[0]} to ${stops[stops.length - 1]}`;
        const distance = trainInfo?.distance ? `${Math.round(trainInfo.distance)} km` : "";
        const duration = trainInfo?.duration
          ? `${Math.floor(trainInfo.duration / 60)}h ${trainInfo.duration % 60}m`
          : "";

        return Response.json({ stops, stationStops: markStops(stationStops, liveStatus), line, waypoints, title, place, distance, duration, liveStatus });
      }
    }

    // Graceful fallback for quota limit (HTTP 429) or offline RailRadar
    const pTrain = popularTrains[no];
    if (!pTrain) return unavailable(no, rTrain?.status === 429);
    const liveStatus = computeLiveStatusFromSchedule(pTrain, startDate);
    const stops = pTrain.halts.map((h) => h.name);
    const stationStops = withStatus(pTrain.halts, liveStatus);

    const title = `${pTrain.name} (${pTrain.number})`;
    const place = `${stops[0]} to ${stops[stops.length - 1]}`;
    const distance = `${pTrain.distance} km`;
    const duration = `${Math.floor(pTrain.duration / 60)}h ${pTrain.duration % 60}m`;
    const line = coords.length >= 2 ? coords : pTrain.line;
    const waypoints = pTrain.halts.map((h) => h.at);

    return Response.json({ stops, stationStops, line, waypoints, title, place, distance, duration, liveStatus });
  } catch {
    const pTrain = popularTrains[no];
    if (!pTrain) return unavailable(no, false);
    const liveStatus = computeLiveStatusFromSchedule({ ...pTrain, number: no }, startDate);
    const stops = pTrain.halts.map((h) => h.name);
    return Response.json({
      stops,
      stationStops: pTrain.halts,
      line: pTrain.line,
      waypoints: pTrain.halts.map((h) => h.at),
      title: `${pTrain.name} (${no})`,
      place: `${stops[0]} to ${stops[stops.length - 1]}`,
      distance: `${pTrain.distance} km`,
      duration: `${Math.floor(pTrain.duration / 60)}h ${pTrain.duration % 60}m`,
      liveStatus,
    });
  }
}
