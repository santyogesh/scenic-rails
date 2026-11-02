import type { LL } from "@/lib/geo";
import { popularTrains, computeLiveStatusFromSchedule } from "@/data/popularTrains";

const BASE = "https://api.railradar.in/v1";
const DEFAULT_KEY = "rg_dfca9b5371834a3f9e43fe5ea7bf21fd";

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
        ? `Live data for train ${no} is unavailable: the RailRadar API quota is used up. Try again later, or enter the stations instead.`
        : `Couldn't reach RailRadar for train ${no}. Try again, or enter the stations instead.`,
    },
    { status: 503 }
  );
}

function getHeaders() {
  const key = process.env.RAILRADAR_API_KEY || DEFAULT_KEY;
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

  // 1. Station search via RailRadar
  if (stationQuery) {
    try {
      const stop = await searchStation(stationQuery);
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

  // Dedicated lightweight live status polling endpoint
  if (sp.get("liveOnly") === "1") {
    try {
      const rLive = await fetch(liveUrl, {
        headers: getHeaders(),
        signal: AbortSignal.timeout(10000),
      });
      if (rLive.ok) {
        const jLive = await rLive.json();
        const d = jLive?.data;
        if (d) {
          const lat = d.currentLocation?.coordinates?.lat;
          const lng = d.currentLocation?.coordinates?.lng;
          const liveStatus = {
            trainNumber: d.trainNumber || no,
            trainName: d.trainName,
            status: d.status || (d.isLive ? "running" : "unknown"),
            isLive: Boolean(d.isLive),
            delayMinutes: typeof d.delayMinutes === "number" ? d.delayMinutes : 0,
            lastUpdatedAt: d.lastUpdatedAt || new Date().toISOString(),
            currentLocation: d.currentLocation
              ? {
                  stationName: d.currentLocation.stationName,
                  stationCode: d.currentLocation.stationCode,
                  status: d.currentLocation.status,
                  coordinates: d.currentLocation.coordinates,
                  at: typeof lng === "number" && typeof lat === "number" ? ([lng, lat] as LL) : undefined,
                  distanceFromOriginKm: d.currentLocation.distanceFromOriginKm,
                  delayMinutes: d.currentLocation.delayMinutes,
                  speedKmh: d.currentLocation.speedKmh,
                  segmentProgress: d.currentLocation.segmentProgress,
                  bearing: typeof d.currentLocation.bearing === "number" ? d.currentLocation.bearing : undefined,
                }
              : undefined,
            previousHalt: d.previousHalt,
            nextHalt: d.nextHalt,
          };
          return Response.json({ liveStatus });
        }
      }
    } catch {}

    // Fallback live status computation
    const pTrain = popularTrains[no];
    if (!pTrain) return Response.json({ liveStatus: null }, { status: 503 });
    const liveStatus = computeLiveStatusFromSchedule({ ...pTrain, number: no }, startDate);
    return Response.json({ liveStatus });
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
        let liveRouteMap = new Map<string, any>();

        if (rLive && rLive.ok) {
          try {
            const jLive = await rLive.json();
            const d = jLive?.data;
            if (d) {
              const lat = d.currentLocation?.coordinates?.lat;
              const lng = d.currentLocation?.coordinates?.lng;
              liveStatus = {
                trainNumber: d.trainNumber || no,
                trainName: d.trainName,
                status: d.status || (d.isLive ? "running" : "unknown"),
                isLive: Boolean(d.isLive),
                delayMinutes: typeof d.delayMinutes === "number" ? d.delayMinutes : 0,
                lastUpdatedAt: d.lastUpdatedAt || new Date().toISOString(),
                currentLocation: d.currentLocation
                  ? {
                      stationName: d.currentLocation.stationName,
                      stationCode: d.currentLocation.stationCode,
                      status: d.currentLocation.status,
                      coordinates: d.currentLocation.coordinates,
                      at: typeof lng === "number" && typeof lat === "number" ? ([lng, lat] as LL) : undefined,
                      distanceFromOriginKm: d.currentLocation.distanceFromOriginKm,
                      delayMinutes: d.currentLocation.delayMinutes,
                      speedKmh: d.currentLocation.speedKmh,
                      segmentProgress: d.currentLocation.segmentProgress,
                  bearing: typeof d.currentLocation.bearing === "number" ? d.currentLocation.bearing : undefined,
                    }
                  : undefined,
                previousHalt: d.previousHalt,
                nextHalt: d.nextHalt,
              };

              if (Array.isArray(d.route)) {
                d.route.forEach((st: any) => {
                  if (st.stationCode) liveRouteMap.set(st.stationCode, st);
                });
              }
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
              status: liveInfo?.status as string | undefined,
              delayArrival: liveInfo?.delayArrival as number | undefined,
              delayDeparture: liveInfo?.delayDeparture as number | undefined,
              platform: liveInfo?.platform as string | undefined,
            };
          });

        const fallbackLine: LL[] = rawRoute
          .filter((x) => typeof x?.station?.lng === "number" && typeof x?.station?.lat === "number")
          .map((x) => [x.station.lng, x.station.lat] as LL);

        const line = coords.length >= 2 ? coords : fallbackLine;
        const trainInfo = j?.data?.train;
        const title = trainInfo?.name
          ? `${trainInfo.name} (${trainInfo.number || no})`
          : `${stops[0]} to ${stops[stops.length - 1]}`;
        const place = `${stops[0]} to ${stops[stops.length - 1]}`;
        const distance = trainInfo?.distance ? `${Math.round(trainInfo.distance)} km` : "";
        const duration = trainInfo?.duration
          ? `${Math.floor(trainInfo.duration / 60)}h ${trainInfo.duration % 60}m`
          : "";

        return Response.json({ stops, stationStops, line, title, place, distance, duration, liveStatus });
      }
    }

    // Graceful fallback for quota limit (HTTP 429) or offline RailRadar
    const pTrain = popularTrains[no];
    if (!pTrain) return unavailable(no, rTrain?.status === 429);
    const liveStatus = computeLiveStatusFromSchedule(pTrain, startDate);
    const stops = pTrain.halts.map((h) => h.name);
    const stationStops = pTrain.halts.map((h) => {
      let stStatus = "upcoming";
      if (liveStatus.currentLocation?.distanceFromOriginKm !== undefined && h.distance !== undefined) {
        if (h.distance <= liveStatus.currentLocation.distanceFromOriginKm) stStatus = "departed";
        else if (h.code === liveStatus.nextHalt?.stationCode) stStatus = "current";
      }
      return {
        ...h,
        status: stStatus,
        delayArrival: liveStatus.delayMinutes,
        delayDeparture: liveStatus.delayMinutes,
        platform: "1",
      };
    });

    const title = `${pTrain.name} (${pTrain.number})`;
    const place = `${stops[0]} to ${stops[stops.length - 1]}`;
    const distance = `${pTrain.distance} km`;
    const duration = `${Math.floor(pTrain.duration / 60)}h ${pTrain.duration % 60}m`;
    const line = coords.length >= 2 ? coords : pTrain.line;

    return Response.json({ stops, stationStops, line, title, place, distance, duration, liveStatus });
  } catch {
    const pTrain = popularTrains[no];
    if (!pTrain) return unavailable(no, false);
    const liveStatus = computeLiveStatusFromSchedule({ ...pTrain, number: no }, startDate);
    const stops = pTrain.halts.map((h) => h.name);
    return Response.json({
      stops,
      stationStops: pTrain.halts,
      line: pTrain.line,
      title: `${pTrain.name} (${no})`,
      place: `${stops[0]} to ${stops[stops.length - 1]}`,
      distance: `${pTrain.distance} km`,
      duration: `${Math.floor(pTrain.duration / 60)}h ${pTrain.duration % 60}m`,
      liveStatus,
    });
  }
}
