import type { LL } from "./geo";
import type { Stop } from "./rail";
import { overpassQuery } from "./overpass";
import type { Country, TrainQuery } from "./countries";

export type OsmTrain = { id: number; ref: string; name: string; from?: string; to?: string; operator?: string; stops: Stop[]; line: LL[] };

const CACHE_MS = 24 * 3600000;
const cache = new Map<string, { data: OsmTrain | null; expiry: number }>();

const near = (a: LL, b: LL) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;

/** Join a relation's track ways, in member order, into one line, flipping ways that run the other way. */
function stitch(ways: LL[][]): LL[] {
  const line: LL[] = [];
  for (const w of ways) {
    if (w.length < 2) continue;
    if (!line.length) {
      line.push(...w);
      continue;
    }
    const end = line[line.length - 1];
    if (near(end, w[0])) line.push(...w.slice(1));
    else if (near(end, w[w.length - 1])) line.push(...w.slice(0, -1).reverse());
    else if (line.length === ways[0].length && (near(line[0], w[0]) || near(line[0], w[w.length - 1]))) {
      // The first way was stored backwards.
      line.reverse();
      line.push(...(near(line[line.length - 1], w[0]) ? w.slice(1) : w.slice(0, -1).reverse()));
    } else line.push(...w);
  }
  return line;
}

/** A train route mapped in OpenStreetMap as a route=train relation whose ref is the train number. */
export async function osmTrain(q: TrainQuery, country: Country, deadline: number): Promise<OsmTrain | null> {
  const key = `${country.code}:${q.prefix}${q.num}${q.suffix}`;
  const hit = cache.get(key);
  if (hit && hit.expiry > Date.now()) return hit.data;

  const [w, s, e, n] = country.bbox;
  const pre = q.prefix ? `${q.prefix}[ .]?` : "[A-Za-z]*[ .]?";
  const ref = `^(${pre})?0*${q.num}${q.suffix}$`;
  const query = `[out:json][timeout:25];
relation["route"="train"]["ref"~"${ref}",i](${s},${w},${n},${e})->.r;
.r out body;
node(r.r)->.n;
.n out body qt;
way(r.r);
out geom qt;`;
  const els = await overpassQuery(query, deadline);
  if (!els) return null;

  const nodes = new Map<number, any>(), ways = new Map<number, LL[]>();
  const rels: any[] = [];
  for (const el of els) {
    if (el.type === "node") nodes.set(el.id, el);
    else if (el.type === "way" && Array.isArray(el.geometry)) ways.set(el.id, el.geometry.map((g: any) => [g.lon, g.lat] as LL));
    else if (el.type === "relation") rels.push(el);
  }

  const exact = (r: any) => String(r.tags?.ref ?? "").replace(/[\s.]/g, "").toUpperCase() === `${q.prefix}${q.num}${q.suffix}`;
  const stopsOf = (r: any) => (r.members ?? []).filter((m: any) => m.type === "node" && /^stop/.test(m.role ?? "") && nodes.get(m.ref)?.tags?.name);
  const best = rels.sort((a, b) => Number(exact(b)) - Number(exact(a)) || stopsOf(b).length - stopsOf(a).length)[0];
  if (!best) {
    cache.set(key, { data: null, expiry: Date.now() + CACHE_MS });
    return null;
  }

  let members = stopsOf(best);
  if (members.length < 2) members = (best.members ?? []).filter((m: any) => m.type === "node" && m.role === "platform" && nodes.get(m.ref)?.tags?.name);
  const stops: Stop[] = [];
  for (const m of members) {
    const nd = nodes.get(m.ref);
    const name: string = nd.tags["name:en"] ?? nd.tags.name;
    if (stops[stops.length - 1]?.name === name) continue;
    stops.push({ name, code: `osm${nd.id}`, at: [nd.lon, nd.lat], sequence: stops.length + 1 });
  }
  const line = stitch((best.members ?? []).filter((m: any) => m.type === "way" && !/platform/.test(m.role ?? "")).map((m: any) => ways.get(m.ref) ?? []));

  const t = best.tags ?? {};
  const data: OsmTrain | null =
    stops.length >= 2
      ? { id: best.id, ref: t.ref ?? `${q.prefix} ${q.num}`.trim(), name: t["name:en"] ?? t.name ?? "", from: t.from, to: t.to, operator: t.operator, stops, line }
      : null;
  cache.set(key, { data, expiry: Date.now() + CACHE_MS });
  return data;
}
