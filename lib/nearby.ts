import { useEffect, useRef, useState } from "react";
import { hav, LL } from "./geo";
import { kindFromText, WindowKind } from "./window";
import { wjson } from "./wikiWindow";

export type NearbyItem = {
  id: string;
  name: string;
  kind: WindowKind;
  at: LL;
  text: string;
  img?: string;
  url?: string;
  source: "osm" | "wikipedia";
};

const WIKI_MAX_RADIUS_KM = 10;
const KEEP = 60;
const REFETCH_KM = 2;
const CACHE_PREFIX = "scenic:nearby:";

/** Wikipedia articles with coordinates around a point (geosearch caps the radius at 10 km). */
export async function wikiNearby(at: LL, radiusKm: number): Promise<NearbyItem[]> {
  const r = Math.min(WIKI_MAX_RADIUS_KM, radiusKm) * 1000;
  const j = await wjson(
    `generator=geosearch&ggscoord=${at[1]}|${at[0]}&ggsradius=${r}&ggslimit=500` +
      `&prop=description|coordinates|pageimages&colimit=max&piprop=thumbnail&pithumbsize=400&pilimit=max`
  );
  const out: NearbyItem[] = [];
  for (const pg of Object.values(j?.query?.pages ?? {}) as any[]) {
    const c = pg.coordinates?.[0];
    if (!c) continue;
    const kind = kindFromText(`${pg.title} ${pg.description ?? ""}`);
    if (!kind) continue;
    out.push({
      id: `wiki:${pg.pageid}`,
      name: pg.title,
      kind,
      at: [c.lon, c.lat],
      text: pg.description ? pg.description.replace(/^\w/, (s: string) => s.toUpperCase()) + "." : "",
      img: pg.thumbnail?.source,
      url: `https://en.wikipedia.org/?curid=${pg.pageid}`,
      source: "wikipedia",
    });
  }
  return out;
}

export async function osmNearby(at: LL, radiusKm: number): Promise<NearbyItem[]> {
  const r = await fetch(`/api/nearby?lat=${at[1].toFixed(5)}&lng=${at[0].toFixed(5)}&r=${radiusKm}`, { signal: AbortSignal.timeout(45000) });
  if (!r.ok) return [];
  const j = await r.json();
  return Array.isArray(j.items) ? j.items : [];
}

const norm = (s: string) =>
  s.toLowerCase().replace(/\(.*?\)|,.*$/g, "").replace(/\b(river|nadi|lake|dam|fort|temple|the)\b/g, "").replace(/[^a-z0-9]/g, "");

/** Merge sources (Wikipedia wins on duplicates) and keep the closest ones. */
export function mergeNearby(at: LL, lists: NearbyItem[][]): NearbyItem[] {
  const out: NearbyItem[] = [];
  for (const it of lists.flat()) {
    const n = norm(it.name);
    const radius = it.kind === "river" || it.kind === "wildlife" ? 8 : 2;
    const dup = out.find((o) => o.id === it.id || (n && norm(o.name) === n && hav(o.at, it.at) <= radius));
    if (dup) {
      dup.img ??= it.img;
      if (dup.text.length < it.text.length && it.source === "wikipedia") dup.text = it.text;
      continue;
    }
    out.push({ ...it });
  }
  return out.sort((a, b) => hav(at, a.at) - hav(at, b.at)).slice(0, KEEP);
}

const cacheKey = (at: LL, r: number) => `${CACHE_PREFIX}${at[1].toFixed(2)},${at[0].toFixed(2)},${r}`;

function readCache(at: LL, r: number): NearbyItem[] | null {
  try { return JSON.parse(sessionStorage.getItem(cacheKey(at, r)) ?? "null"); } catch { return null; }
}

function writeCache(at: LL, r: number, items: NearbyItem[]) {
  try { sessionStorage.setItem(cacheKey(at, r), JSON.stringify(items)); } catch {}
}

/** Landmarks around a moving position; searches again only after moving more than 2 km. */
export function useNearby(at: LL | null, radiusKm = 10) {
  const [items, setItems] = useState<NearbyItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const from = useRef<LL | null>(null);
  const req = useRef(0);

  useEffect(() => {
    if (!at || (from.current && hav(from.current, at) < REFETCH_KM)) return;
    from.current = at;
    const id = ++req.current;
    const cached = readCache(at, radiusKm);
    if (cached) { setItems(cached); setLoading(false); return; }
    setLoading(true);
    const lists: NearbyItem[][] = [];
    const add = (list: NearbyItem[]) => {
      if (id !== req.current) return;
      lists.push(list);
      setItems(mergeNearby(at, lists));
    };
    Promise.allSettled([wikiNearby(at, radiusKm).then(add), osmNearby(at, radiusKm).then(add)]).then(() => {
      if (id !== req.current) return;
      setLoading(false);
      const merged = mergeNearby(at, lists);
      setItems(merged);
      if (merged.length) writeCache(at, radiusKm, merged);
    });
  }, [at?.[0], at?.[1], radiusKm]);

  return { items, loading };
}
