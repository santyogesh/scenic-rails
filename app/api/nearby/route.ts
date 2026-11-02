import type { LL } from "@/lib/geo";
import type { NearbyItem } from "@/lib/nearby";
import { overpassQuery } from "@/lib/overpass";
import { osmKind, osmText } from "@/lib/window";

export const maxDuration = 40;

const MAX_RADIUS_KM = 15;
const BUDGET_MS = 30000;
const cache = new Map<string, { items: NearbyItem[]; expiry: number }>();

/** Named landmarks from OpenStreetMap within `r` km of a point, for the camera view. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat")), lng = Number(sp.get("lng"));
  const r = Math.min(MAX_RADIUS_KM, Math.max(1, Number(sp.get("r")) || 10));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return Response.json({ error: "Need lat and lng." }, { status: 400 });
  }

  // About 1 km cells, so people standing close together share one Overpass query.
  const key = `${lat.toFixed(2)},${lng.toFixed(2)},${r}`;
  const hit = cache.get(key);
  if (hit && hit.expiry > Date.now()) return Response.json({ items: hit.items, cached: true });

  const near = Math.min(r, 5) * 1000, far = r * 1000;
  const C = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const q = `[out:json][timeout:25];
(
 nwr(around:${far},${C})[historic~"^(fort|castle|palace)$"][name];
 nwr(around:${near},${C})[historic~"^(monument|ruins|memorial|archaeological_site|city_gate|tomb)$"][name];
 nwr(around:${near},${C})[tourism~"^(attraction|viewpoint|museum)$"][name];
 nwr(around:${far},${C})[natural~"^(peak|volcano|waterfall|cliff|valley|gorge)$"][name];
 nwr(around:${near},${C})[natural~"^(beach|bay|cape)$"][name];
 nwr(around:${far},${C})[waterway~"^(waterfall|dam)$"][name];
 nwr(around:${far},${C})[natural=water][name];
 nwr(around:${far},${C})[landuse=reservoir][name];
 nwr(around:${near},${C})[amenity=place_of_worship][name];
 node(around:${far},${C})[place~"^(city|town)$"][name];
 node(around:${near},${C})[railway~"^(station|halt)$"][name];
);
out center tags;`;

  const els = await overpassQuery(q, Date.now() + BUDGET_MS);
  if (!els) return Response.json({ items: [], error: "OpenStreetMap is busy." }, { status: 503 });

  const items: NearbyItem[] = [];
  for (const e of els) {
    const t = e.tags ?? {};
    if (!t.name) continue;
    const at: LL | null = typeof e.lat === "number" ? [e.lon, e.lat] : e.center ? [e.center.lon, e.center.lat] : null;
    if (!at) continue;
    const kind = osmKind(t);
    items.push({
      id: `osm:${e.type}/${e.id}`,
      name: t["name:en"] || t.name,
      kind,
      at,
      text: osmText(t, kind),
      url: `https://www.openstreetmap.org/${e.type}/${e.id}`,
      source: "osm",
    });
  }
  if (cache.size > 2000) cache.clear();
  cache.set(key, { items, expiry: Date.now() + 6 * 3600000 });
  return Response.json({ items });
}
