import type { LL } from "./geo";

export type Place = { state?: string; district?: string; blurb?: string };

const CELL_DEG = 0.05; // about 5 km
const MIN_GAP_MS = 30000; // Nominatim asks for light use; one lookup per 30 s is plenty for a train.

let lastCall = 0;
let queue: Promise<unknown> = Promise.resolve();

export const placeCell = (at: LL) => `${Math.round(at[1] / CELL_DEG)}:${Math.round(at[0] / CELL_DEG)}`;

function cached(key: string): Place | null {
  try {
    const v = sessionStorage.getItem(`where:${key}`);
    return v ? (JSON.parse(v) as Place) : null;
  } catch {
    return null;
  }
}

async function reverse(at: LL): Promise<Pick<Place, "state" | "district">> {
  const wait = lastCall + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const r = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=en&lat=${at[1]}&lon=${at[0]}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!r.ok) return {};
  const a = (await r.json())?.address ?? {};
  return { state: a.state, district: a.state_district || a.county || a.city_district || a.city };
}

async function districtBlurb(district: string): Promise<string | undefined> {
  const base = district.replace(/\s+district$/i, "");
  for (const title of [`${base} district`, base]) {
    try {
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) continue;
      const j = await r.json();
      if (j.type === "disambiguation" || !j.extract) continue;
      return (j.extract as string).match(/^.+?[.!?](\s|$)/)?.[0].trim() ?? j.extract;
    } catch {}
  }
  return undefined;
}

/** State, district and a one-line district summary for a point. Cached per ~5 km cell, and throttled. */
export function whereAmI(at: LL): Promise<Place> {
  const key = placeCell(at);
  const hit = cached(key);
  if (hit) return Promise.resolve(hit);
  const job = queue.then(async () => {
    const again = cached(key);
    if (again) return again;
    const p: Place = await reverse(at).catch(() => ({}));
    if (p.district) p.blurb = await districtBlurb(p.district);
    if (p.state || p.district) {
      try {
        sessionStorage.setItem(`where:${key}`, JSON.stringify(p));
      } catch {}
    }
    return p;
  });
  queue = job.catch(() => {});
  return job;
}
