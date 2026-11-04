import type { LL } from "@/lib/geo";
import { markStops, type LiveTrainStatus, type Stop, type StopTime } from "@/lib/rail";
import { computeLiveStatusFromSchedule } from "@/data/popularTrains";
import { getCountry, isCountry, parseTrainQuery, todayIn, type Country, type TrainQuery } from "@/lib/countries";
import { findTrip, geocodeStops, tripDetails, type TransitousTrain } from "@/lib/transitous";
import { osmTrain } from "@/lib/osmTrain";

export const maxDuration = 60;

const BUDGET_MS = 50000;

type Train = { number: string; name: string; operator?: string; tz: string; stops: Stop[]; line: LL[]; distance: number; duration: number; tripId?: string; source: "transitous" | "osm" };

/** Timetable position, using real-time times where the feed has them; the delay is the next stop's. */
function liveFor(t: Train, startDate: string): LiveTrainStatus | null {
  if (!t.stops.some((s) => s.departure || s.arrival)) return null;
  const halts = t.stops.map((s) => ({ ...s, arrival: s.actualArrival ?? s.arrival, departure: s.actualDeparture ?? s.departure }));
  const live = computeLiveStatusFromSchedule({ number: t.number, name: t.name, halts, distance: t.distance }, startDate, t.tz);
  const next = t.stops.find((s) => s.code === live.nextHalt?.stationCode);
  const delay = next?.delayArrival ?? next?.delayDeparture;
  return typeof delay === "number" ? { ...live, delayMinutes: delay, nextHalt: { ...live.nextHalt, delayArrival: delay } } : live;
}

function respond(t: Train, startDate: string) {
  const liveStatus = liveFor(t, startDate);
  const names = t.stops.map((s) => s.name);
  const place = `${names[0]} to ${names[names.length - 1]}`;
  const label = !t.name || t.name.includes(t.number) ? t.name || t.number : t.number.includes(t.name) ? t.number : `${t.name} ${t.number}`;
  return Response.json({
    stops: names,
    stationStops: liveStatus ? markStops(t.stops, liveStatus) : t.stops,
    line: t.line.length >= 2 ? t.line : t.stops.map((s) => s.at),
    waypoints: t.stops.map((s) => s.at),
    title: `${label}: ${names[0]} → ${names[names.length - 1]}`,
    place,
    distance: t.distance ? `${t.distance} km` : "",
    duration: t.duration ? `${Math.floor(t.duration / 60)}h ${t.duration % 60}m` : "",
    liveStatus,
    tripId: t.tripId,
    tz: t.tz,
    operator: t.operator,
    source: t.source,
  });
}

const fromTransitous = (d: TransitousTrain): Train => ({ ...d, source: "transitous" });

/** Stop ids to look for the train at: the station the user named, else the country's hubs. */
async function anchors(q: TrainQuery, country: Country, extra?: string): Promise<string[]> {
  const names = extra ? [extra] : q.station ? [q.station] : country.hubs;
  const ids = await Promise.all(names.map((n) => geocodeStops(n, country.code).then((r) => r[0]?.id).catch(() => undefined)));
  return ids.filter((x): x is string => Boolean(x));
}

async function viaTransitous(q: TrainQuery, country: Country, date: string, extraStation?: string): Promise<Train | null> {
  const ids = await anchors(q, country, extraStation);
  if (!ids.length) return null;
  const tripId = await findTrip(q, ids, date, country.tz);
  if (!tripId) return null;
  const d = await tripDetails(tripId, country.tz);
  return d ? fromTransitous(d) : null;
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const c = (sp.get("c") ?? "").toUpperCase();
  if (!isCountry(c) || c === "IN") return Response.json({ error: "Choose a country other than India for this lookup." }, { status: 400 });
  const country = getCountry(c);

  const today = todayIn(country.tz);
  const rawDate = sp.get("date") ?? "";
  const daysAgo = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? Math.round((Date.parse(today) - Date.parse(rawDate)) / 86400000) : NaN;
  const date = daysAgo >= 0 && daysAgo <= 5 ? rawDate : today;

  // Position polling: re-read the trip for fresh real-time times. Trains found only on OpenStreetMap have no timetable.
  if (sp.get("liveOnly") === "1") {
    const tripId = sp.get("trip");
    if (!tripId || tripId.length > 200) return Response.json({ liveStatus: null });
    try {
      const d = await tripDetails(tripId, country.tz);
      if (!d) return Response.json({ liveStatus: null }, { status: 503 });
      const liveStatus = liveFor(fromTransitous(d), date);
      const stopTimes: StopTime[] = d.stops.map((s) => ({
        code: s.code!,
        actualArrival: s.actualArrival,
        actualDeparture: s.actualDeparture,
        delayArrival: s.delayArrival,
        delayDeparture: s.delayDeparture,
        platform: s.platform,
      }));
      return Response.json({ liveStatus, stopTimes });
    } catch {
      return Response.json({ liveStatus: null }, { status: 503 });
    }
  }

  const raw = (sp.get("no") ?? "").trim();
  if (raw.length > 80) return Response.json({ error: "That train number is too long." }, { status: 400 });
  const q = parseTrainQuery(raw);
  if (!q) return Response.json({ error: `Enter a train number, e.g. ${country.example.replace(/^.*e\.g\.\s*/, "")}.` }, { status: 400 });

  const deadline = Date.now() + BUDGET_MS;
  const hint = q.station ? "" : ` Add a station it calls at, e.g. "${raw} @ ${country.hubs[0] ?? "station name"}", or enter the stations instead.`;

  try {
    const t = await viaTransitous(q, country, date).catch(() => null);
    if (t) return respond(t, date);

    const osm = await osmTrain(q, country, deadline).catch(() => null);
    if (osm) {
      // OpenStreetMap knows where it runs; try its first station for a timetable before settling for the route alone.
      const timed = deadline - Date.now() > 12000 ? await viaTransitous(q, country, date, osm.stops[0].name).catch(() => null) : null;
      if (timed) return respond(timed, date);
      return respond(
        {
          number: osm.ref,
          name: osm.name && !osm.name.includes(osm.ref) ? osm.name : "",
          operator: osm.operator,
          tz: country.tz,
          stops: osm.stops,
          line: osm.line,
          distance: 0,
          duration: 0,
          source: "osm",
        },
        date
      );
    }
    return Response.json({ error: `Couldn't find train ${raw} in ${country.name}.${hint}` }, { status: 404 });
  } catch {
    return Response.json({ error: `Couldn't look up train ${raw} right now. Try again in a minute.${hint}` }, { status: 503 });
  }
}
