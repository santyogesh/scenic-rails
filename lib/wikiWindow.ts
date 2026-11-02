import type { LL } from "./geo";
import { locate, Track } from "./side";
import { kindFromText, WindowItem } from "./window";

const WIKI = "https://en.wikipedia.org/w/api.php";
const MAX_OFFSET_KM = 5;
const SEARCH_RADIUS_KM = 10;
// Sample spacing so a 10 km search circle covers 5 km either side of the track with no gaps.
const MAX_STEP_KM = 2 * Math.sqrt(SEARCH_RADIUS_KM ** 2 - MAX_OFFSET_KM ** 2) * 0.95;
const SUMMARIES_UP_FRONT = 60;

// Wikimedia asks API clients to keep to 3 concurrent requests and back off on 429.
async function pool<T>(items: T[], fn: (x: T) => Promise<void>, deadline: number) {
  let k = 0;
  await Promise.all(
    Array.from({ length: Math.min(3, items.length) }, async () => {
      while (k < items.length && Date.now() < deadline) {
        const x = items[k++];
        try { await fn(x); } catch {}
      }
    })
  );
}

async function wjson(params: string, headers?: HeadersInit, retry = true): Promise<any> {
  const r = await fetch(`${WIKI}?action=query&format=json&origin=*&${params}`, { headers, signal: AbortSignal.timeout(10000) });
  if (r.status === 429 && retry) {
    const wait = Math.min(15, Number(r.headers.get("retry-after")) || 5);
    await new Promise((res) => setTimeout(res, wait * 1000));
    return wjson(params, headers, false);
  }
  if (!r.ok) throw new Error(`wikipedia ${r.status}`);
  return r.json();
}

function samples(track: Track, stepKm: number): LL[] {
  const pts: LL[] = [track.line[0]];
  let last = 0;
  for (let i = 1; i < track.line.length; i++) {
    if (track.cum[i] - last >= stepKm) { pts.push(track.line[i]); last = track.cum[i]; }
  }
  if (track.total - last > stepKm / 2) pts.push(track.line[track.line.length - 1]);
  return pts;
}

/** Two-sentence intro for one article, used when a landmark is opened. */
export async function wikiSummary(pageid: number): Promise<string | null> {
  try {
    const j = await wjson(`prop=extracts&exintro=1&explaintext=1&exsentences=3&pageids=${pageid}`);
    return (Object.values(j?.query?.pages ?? {})[0] as any)?.extract || null;
  } catch { return null; }
}

/** Wikipedia articles with coordinates within 5 km of the track, classified by kind and side. Works in the browser and on the server. */
export async function wikiWindow(track: Track, deadline: number, headers?: HeadersInit): Promise<WindowItem[]> {
  const found = new Map<number, WindowItem>();
  await pool(samples(track, MAX_STEP_KM), async (p) => {
    const j = await wjson(
      `generator=geosearch&ggscoord=${p[1]}|${p[0]}&ggsradius=${SEARCH_RADIUS_KM * 1000}&ggslimit=100` +
        `&prop=description|coordinates|pageimages&colimit=max&piprop=thumbnail&pithumbsize=400&pilimit=50`,
      headers
    );
    for (const pg of Object.values(j?.query?.pages ?? {}) as any[]) {
      const c = pg.coordinates?.[0];
      if (found.has(pg.pageid) || !c) continue;
      const kind = kindFromText(`${pg.title} ${pg.description ?? ""}`);
      if (!kind) continue;
      const at: LL = [c.lon, c.lat];
      const loc = locate(track, at);
      if (!loc || loc.offsetKm > MAX_OFFSET_KM) continue;
      found.set(pg.pageid, {
        id: `wiki:${pg.pageid}`,
        name: pg.title,
        kind,
        at,
        km: Math.round(loc.km * 10) / 10,
        side: loc.side,
        offsetKm: Math.round(loc.offsetKm * 10) / 10,
        crossing: (kind === "river" || kind === "bridge") && loc.offsetKm <= 0.3,
        text: pg.description ? pg.description.replace(/^\w/, (s: string) => s.toUpperCase()) + "." : "",
        img: pg.thumbnail?.source,
        url: `https://en.wikipedia.org/?curid=${pg.pageid}`,
        source: "wikipedia",
      });
    }
  }, deadline);

  // Long routes: keep the most interesting items, then present in travel order.
  const score = (k: WindowItem) => (k.img ? 2 : 0) + (k.kind === "town" ? -1 : 1) + (k.crossing ? 2 : 0);
  const cap = Math.max(60, Math.round(track.total / 4));
  const items = [...found.values()].sort((a, b) => score(b) - score(a)).slice(0, cap);

  // Summaries for the best items now; the rest are fetched when opened.
  const top = items.slice(0, SUMMARIES_UP_FRONT);
  const batches: WindowItem[][] = [];
  for (let i = 0; i < top.length; i += 20) batches.push(top.slice(i, i + 20));
  await pool(batches, async (b) => {
    const ids = b.map((it) => it.id.slice(5)).join("|");
    const j = await wjson(`prop=extracts&exintro=1&explaintext=1&exsentences=2&exlimit=20&pageids=${ids}`, headers);
    for (const pg of Object.values(j?.query?.pages ?? {}) as any[]) {
      const it = found.get(pg.pageid);
      if (it && pg.extract) it.text = pg.extract;
    }
  }, deadline + 8000);

  return items.sort((a, b) => a.km - b.km);
}
