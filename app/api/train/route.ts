import type { LL } from "@/lib/geo";

const BASE = "https://api.railradar.in/v1";
const DEFAULT_KEY = "rg_dfca9b5371834a3f9e43fe5ea7bf21fd";

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
  const r = await fetch(`${BASE}/lookup/search/stations?q=${encodeURIComponent(q)}&limit=1`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) return null;
  const j = await r.json();
  const s = j?.data?.[0];
  if (!s || typeof s.lng !== "number" || typeof s.lat !== "number") return null;
  return { name: s.name as string, code: s.code as string, at: [s.lng, s.lat] as LL };
}

async function fetchTrainRouteCoords(trainNo: string): Promise<LL[]> {
  const r = await fetch(`${BASE}/trains/${encodeURIComponent(trainNo)}/route`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) return [];
  const j = await r.json();
  const coords = j?.data?.geojson?.geometry?.coordinates;
  return Array.isArray(coords) ? (coords as LL[]) : [];
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const stationQuery = sp.get("station")?.trim();
  const fromQuery = sp.get("from")?.trim();
  const toQuery = sp.get("to")?.trim();

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

  // 3. Train number lookup + GIS route via RailRadar
  const no = (sp.get("no") ?? "").replace(/\D/g, "");
  if (!no) return Response.json({ error: "Enter a train number." }, { status: 400 });

  try {
    const [rTrain, coords] = await Promise.all([
      fetch(`${BASE}/trains/${encodeURIComponent(no)}`, {
        headers: getHeaders(),
        signal: AbortSignal.timeout(15000),
      }),
      fetchTrainRouteCoords(no),
    ]);

    if (!rTrain.ok) {
      return Response.json({ error: "No route found for that train on RailRadar." }, { status: 404 });
    }

    const j = await rTrain.json();
    const rawRoute: any[] = Array.isArray(j?.data?.route) ? j.data.route : [];
    const halts = rawRoute.filter((x) => x?.isHalt && x?.station?.name);
    const chosen = halts.length >= 2 ? halts : rawRoute.filter((x) => x?.station?.name);

    const stops = chosen.map((x) => x.station.name as string).filter(Boolean);
    if (stops.length < 2) {
      return Response.json({ error: "No route found for that train." }, { status: 404 });
    }

    const stationStops = chosen
      .filter((x) => typeof x.station?.lng === "number" && typeof x.station?.lat === "number")
      .map((x) => ({
        name: x.station.name as string,
        code: x.station.code as string,
        at: [x.station.lng, x.station.lat] as LL,
      }));

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

    return Response.json({ stops, stationStops, line, title, place, distance, duration });
  } catch {
    return Response.json({ error: "RailRadar train lookup failed." }, { status: 502 });
  }
}
