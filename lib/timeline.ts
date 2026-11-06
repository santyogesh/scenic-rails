import { toMin, type LiveTrainStatus, type Stop } from "./rail";
import { locate, type Track } from "./side";
import type { WindowItem } from "./window";

/** Assumed running speed, stops included, when there is no timetable to go by. */
export const AVG_KMH = 50;
/** A stop further than this from the traced track is placed by its timetable distance instead. */
const SNAP_KM = 5;

/** A station placed on the track; times are minutes from midnight of day 1, counting on past midnight. */
export type Anchor = { km: number; arr: number | null; dep: number | null; stop: Stop };

export type TimelineRow =
  | { type: "stop"; key: string; km: number; min: number | null; day: number; stop: Stop }
  | { type: "sight"; key: string; km: number; min: number | null; day: number; item: WindowItem };

export type Timeline = {
  rows: TimelineRow[];
  /** "clock": times of day from the timetable; "elapsed": minutes since departure at AVG_KMH. */
  mode: "clock" | "elapsed";
  /** Minutes added to sight times for a reported delay. */
  delay: number;
};

/** Each stop's distance along the track and its timetable times, rolled past midnight. */
export function stationAnchors(stops: Stop[], track: Track): Anchor[] {
  const lastDist = [...stops].reverse().find((s) => s.distance !== undefined)?.distance;
  let last = -1, wrap = 0;
  const roll = (t: number | null) => {
    if (t === null) return null;
    if (t + wrap < last) wrap += 1440;
    last = t + wrap;
    return last;
  };
  return stops.map((stop) => {
    const pos = locate(track, stop.at);
    const scaled = stop.distance !== undefined && lastDist ? (stop.distance * track.total) / lastDist : null;
    const km = pos && (pos.offsetKm < SNAP_KM || scaled === null) ? pos.km : scaled ?? 0;
    return { km, arr: roll(toMin(stop.arrival)), dep: roll(toMin(stop.departure)), stop };
  });
}

/** Timed anchors whose distance only increases, so they can be interpolated between. */
function timedAnchors(anchors: Anchor[]): Anchor[] {
  const out: Anchor[] = [];
  for (const a of anchors) {
    if (a.arr === null && a.dep === null) continue;
    const prev = out[out.length - 1];
    if (prev && (a.km < prev.km || (a.arr ?? a.dep)! < (prev.dep ?? prev.arr)!)) continue;
    out.push(a);
  }
  return out;
}

/** Scheduled minutes at `km`, from the departure of the stop before to the arrival at the stop after. */
export function minutesAt(km: number, timed: Anchor[]): number | null {
  if (timed.length < 2) return null;
  const first = timed[0], last = timed[timed.length - 1];
  if (km <= first.km) return first.dep ?? first.arr;
  if (km >= last.km) return last.arr ?? last.dep;
  let i = 0;
  while (i < timed.length - 2 && timed[i + 1].km < km) i++;
  const a = timed[i], b = timed[i + 1];
  const t0 = a.dep ?? a.arr!, t1 = b.arr ?? b.dep!;
  const f = b.km > a.km ? (km - a.km) / (b.km - a.km) : 0;
  return t0 + (t1 - t0) * f;
}

/** Every stop and landmark along the journey in travel order, each with an estimated time. */
export function buildTimeline(items: WindowItem[] | null, stops: Stop[], track: Track, live?: LiveTrainStatus | null): Timeline {
  const anchors = stationAnchors(stops, track);
  const timed = timedAnchors(anchors);
  const mode = timed.length >= 2 ? "clock" : "elapsed";
  const at = (km: number) => (mode === "clock" ? minutesAt(km, timed) : (km / AVG_KMH) * 60);
  const day = (min: number | null) => (mode === "clock" && min !== null ? Math.floor(min / 1440) + 1 : 1);
  const delay = mode === "clock" && live && !live.estimated && live.status !== "completed" ? live.delayMinutes || 0 : 0;

  const rows: TimelineRow[] = anchors.map((a, i) => {
    const min = mode === "clock" ? a.arr ?? a.dep ?? at(a.km) : at(a.km);
    return { type: "stop", key: `stop-${i}-${a.stop.code ?? a.stop.name}`, km: a.km, min, day: day(min), stop: a.stop };
  });
  for (const it of items ?? []) {
    const min = at(it.km);
    rows.push({ type: "sight", key: it.id, km: it.km, min, day: day(min), item: it });
  }
  return { rows: rows.sort((x, y) => x.km - y.km || (x.type === "stop" ? -1 : 1)), mode, delay };
}

/** "+2 h 15 min" style time since departure. */
export function elapsedText(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  return h ? `+${h} h ${m % 60} min` : `+${m} min`;
}
