import { hav, LL } from "./geo";

export type Side = "left" | "right";
export type TrackPos = { km: number; offsetKm: number; side: Side; seg: number };

const KM_LAT = 110.57;
const KM_LNG = 111.32;

// Flat local projection (km) around a reference latitude; accurate enough within a few km of the track.
const proj = (p: LL, cosLat: number): [number, number] => [p[0] * cosLat * KM_LNG, p[1] * KM_LAT];

/** Make the line run from the first stop to the last stop (direction of travel). */
export function orientLine(line: LL[], first?: LL, last?: LL): LL[] {
  if (line.length < 2 || !first || !last) return line;
  const forward = hav(line[0], first) + hav(line[line.length - 1], last);
  const backward = hav(line[0], last) + hav(line[line.length - 1], first);
  return backward < forward ? [...line].reverse() : line;
}

export type Track = { line: LL[]; cum: number[]; total: number };

export function makeTrack(line: LL[]): Track {
  const cum = [0];
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + hav(line[i - 1], line[i]));
  return { line, cum, total: cum[cum.length - 1] ?? 0 };
}

/** Nearest point on the track: distance along it, perpendicular offset, and which side (facing travel). */
export function locate(track: Track, p: LL): TrackPos | null {
  const { line, cum } = track;
  if (line.length < 2) return null;
  let best: TrackPos | null = null;
  let bestD = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const a0 = line[i], b0 = line[i + 1];
    // Cheap bounding reject (~0.1 deg ≈ 11 km)
    if (Math.min(a0[0], b0[0]) - 0.1 > p[0] || Math.max(a0[0], b0[0]) + 0.1 < p[0]) continue;
    if (Math.min(a0[1], b0[1]) - 0.1 > p[1] || Math.max(a0[1], b0[1]) + 0.1 < p[1]) continue;
    const cosLat = Math.cos(((a0[1] + b0[1]) / 2) * (Math.PI / 180));
    const a = proj(a0, cosLat), b = proj(b0, cosLat), q = proj(p, cosLat);
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / len2)) : 0;
    const cx = a[0] + dx * t, cy = a[1] + dy * t;
    const d = Math.hypot(q[0] - cx, q[1] - cy);
    if (d < bestD) {
      bestD = d;
      const cross = dx * (q[1] - a[1]) - dy * (q[0] - a[0]);
      best = { km: cum[i] + (cum[i + 1] - cum[i]) * t, offsetKm: d, side: cross >= 0 ? "left" : "right", seg: i };
    }
  }
  return best;
}

/** Point and compass bearing (degrees clockwise from north) at a distance along the track. */
export function pointAt(track: Track, km: number): { at: LL; bearing: number } {
  const { line, cum } = track;
  if (line.length < 2) return { at: line[0] ?? [0, 0], bearing: 0 };
  const d = Math.max(0, Math.min(km, track.total));
  let i = 0;
  while (i < cum.length - 2 && cum[i + 1] < d) i++;
  const a = line[i], b = line[i + 1];
  const f = (d - cum[i]) / (cum[i + 1] - cum[i] || 1);
  return { at: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], bearing: bearing(a, b) };
}

export function bearing(a: LL, b: LL): number {
  const cosLat = Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180));
  return ((Math.atan2((b[0] - a[0]) * cosLat, b[1] - a[1]) * 180) / Math.PI + 360) % 360;
}

export type Relative = { distKm: number; rel: number; side: Side; ahead: boolean };

/** Where a point is as seen from the train: straight-line distance, and side/ahead relative to its heading. */
export function relativeTo(trainAt: LL, heading: number, p: LL): Relative {
  const rel = ((((bearing(trainAt, p) - heading) % 360) + 540) % 360) - 180;
  return { distKm: hav(trainAt, p), rel, side: rel < 0 ? "left" : "right", ahead: Math.abs(rel) < 90 };
}

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export const compass = (deg: number) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];

/** Keep roughly one vertex per `stepKm`, always retaining the endpoints. */
export function thin(line: LL[], stepKm: number): LL[] {
  if (line.length < 3) return line;
  const out: LL[] = [line[0]];
  let acc = 0;
  for (let i = 1; i < line.length - 1; i++) {
    acc += hav(line[i - 1], line[i]);
    if (acc >= stepKm) { out.push(line[i]); acc = 0; }
  }
  out.push(line[line.length - 1]);
  return out;
}
