import type { LL } from "@/lib/geo";
import { hav } from "@/lib/geo";
import { locate, makeTrack, thin, Track } from "@/lib/side";
import { kindFromText, WindowItem, WindowKind } from "@/lib/window";

export const maxDuration = 60;

const MAX_OFFSET_KM = 5;
const SOURCE_BUDGET_MS = 32000;
const OSM_ONLY_BUDGET_MS = 44000;
const UA = "ScenicRails/1.0 (https://github.com/santyogesh/scenic-rails)";
const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const BHARATLAS = "https://bharatlas.com/api/v1";
const WIKI = "https://en.wikipedia.org/w/api.php";

const cache = new Map<string, { items: WindowItem[]; expiry: number }>();
let wildlifeInfo: { at: number; byName: Map<string, any> } | null = null;

type Cand = Omit<WindowItem, "km" | "side" | "offsetKm" | "id"> & { key: string; wiki?: string; pageid?: number };

async function tfetch(url: string, init: RequestInit = {}, ms = 12000) {
  return fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers || {}) }, signal: AbortSignal.timeout(ms) });
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>, deadline: number) {
  let k = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (k < items.length && Date.now() < deadline) {
        const x = items[k++];
        try { await fn(x); } catch {}
      }
    })
  );
}

const norm = (s: string) =>
  s.toLowerCase().replace(/\b(river|nadi|lake|dam|fort|temple|the)\b/g, "").replace(/[^a-z0-9]/g, "");

function hash(line: LL[]) {
  let h = 2166136261;
  const s = line.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(";");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36) + ":" + line.length;
}

function chunks(line: LL[], maxKm: number): LL[][] {
  const out: LL[][] = [];
  let cur: LL[] = [line[0]], acc = 0;
  for (let i = 1; i < line.length; i++) {
    cur.push(line[i]);
    acc += hav(line[i - 1], line[i]);
    if (acc >= maxKm && i < line.length - 1) { out.push(cur); cur = [line[i]]; acc = 0; }
  }
  if (cur.length >= 2) out.push(cur);
  return out;
}

function samples(track: Track, stepKm: number): LL[] {
  const pts: LL[] = [track.line[0]];
  let next = stepKm;
  for (let i = 1; i < track.line.length; i++) {
    if (track.cum[i] >= next) { pts.push(track.line[i]); next = track.cum[i] + stepKm; }
  }
  return pts;
}

/* ---------------- OpenStreetMap (Overpass) ---------------- */

function osmKind(t: Record<string, string>): WindowKind {
  if (t.waterway === "river") return "river";
  if (t.waterway === "waterfall" || t.natural === "waterfall") return "waterfall";
  if (t.waterway === "dam") return "dam";
  if (t.natural === "water") return "lake";
  if (t.leisure === "nature_reserve" || t.boundary === "protected_area") return "wildlife";
  if (t.amenity === "place_of_worship") return "worship";
  if (t.bridge) return "bridge";
  if (t.place) return "town";
  if (["peak", "volcano", "cliff", "valley", "gorge", "ridge", "hill"].includes(t.natural)) return "hill";
  if (["beach", "bay", "cape"].includes(t.natural)) return "beach";
  if (["fort", "castle", "palace", "city_gate"].includes(t.historic)) return "fort";
  if (t.historic || t.tourism === "museum") return "heritage";
  return kindFromText(`${t.name} ${t.description || ""}`) ?? "sight";
}

function osmText(t: Record<string, string>, kind: WindowKind): string {
  const bits: string[] = [];
  const pretty = (s?: string) => (s ? s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "");
  if (t.description) bits.push(t.description);
  switch (kind) {
    case "hill": bits.push(`${pretty(t.natural) || "Hill"}${t.ele ? `, ${Math.round(Number(t.ele)).toLocaleString("en-IN")} m high` : ""}`); break;
    case "town": bits.push(`${pretty(t.place)}${t.population ? ` of about ${Number(t.population).toLocaleString("en-IN")} people` : ""}`); break;
    case "worship": bits.push(`${t.religion ? pretty(t.religion) + " " : ""}place of worship`); break;
    case "fort":
    case "heritage": bits.push(`${pretty(t.historic || t.tourism) || "Historic site"}${t.start_date ? `, dating from ${t.start_date}` : ""}`); break;
    case "dam": bits.push("Dam"); break;
    case "lake": bits.push(pretty(t.water) || "Lake"); break;
    case "wildlife": bits.push(t.protection_title || "Protected nature area"); break;
    case "waterfall": bits.push(`Waterfall${t.height ? `, ${t.height} m drop` : ""}`); break;
    case "bridge": bits.push("Railway bridge"); break;
    default: bits.push(pretty(t.tourism || t.natural) || "Point of interest");
  }
  if (t.heritage) bits.push("Listed heritage site");
  return [...new Set(bits)].filter(Boolean).join(". ");
}

async function overpassQuery(q: string, deadline: number): Promise<any[] | null> {
  for (let attempt = 0; attempt < OVERPASS.length && Date.now() < deadline - 3000; attempt++) {
    const url = OVERPASS[(attempt + Math.floor(Math.random() * OVERPASS.length)) % OVERPASS.length];
    try {
      const r = await tfetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(q),
      }, Math.min(25000, deadline - Date.now()));
      if (!r.ok) continue;
      const j = await r.json();
      if (Array.isArray(j?.elements)) return j.elements;
    } catch {}
  }
  return null;
}

async function fromOverpass(track: Track, out: Cand[], deadline: number) {
  const qline = thin(track.line, 2);
  await pool(chunks(qline, 150), 3, async (part) => {
    const C = part.map((p) => `${p[1].toFixed(5)},${p[0].toFixed(5)}`).join(",");
    const lats = part.map((p) => p[1]), lngs = part.map((p) => p[0]);
    const bb = [Math.min(...lats) - 0.05, Math.min(...lngs) - 0.05, Math.max(...lats) + 0.05, Math.max(...lngs) + 0.05].map((x) => x.toFixed(4)).join(",");
    const A = `(around:${MAX_OFFSET_KM * 1000},${C})`;
    const q = `[out:json][timeout:25];
(
 nwr${A}[historic~"^(fort|castle|monument|ruins|memorial|archaeological_site|palace|city_gate|tomb)$"][name];
 nwr${A}[tourism~"^(attraction|viewpoint|museum)$"][name];
 nwr${A}[natural~"^(peak|volcano|waterfall|cliff|beach|bay|cape|valley|gorge)$"][name];
 nwr${A}[waterway~"^(waterfall|dam)$"][name];
 nwr${A}[natural=water][name][wikidata];
 nwr${A}[leisure=nature_reserve][name];
 nwr${A}[boundary=protected_area][name];
 nwr${A}[amenity=place_of_worship][name][wikidata];
 node${A}[place~"^(city|town)$"][name];
);
out center tags;
way(around:400,${C})[waterway=river][name];
out tags geom(${bb});
way(around:150,${C})[railway=rail][bridge][name];
out center tags;`;
    const els = await overpassQuery(q, deadline);
    for (const e of els ?? []) {
      const t = e.tags ?? {};
      if (!t.name) continue;
      const name: string = t["name:en"] || t.name;
      let at: LL | null = null;
      if (Array.isArray(e.geometry) && e.geometry.length) {
        // River: take the vertex closest to the track (that's where you see it / cross it).
        let best = Infinity;
        for (const g of e.geometry) {
          if (!g) continue;
          const p: LL = [g.lon, g.lat];
          const loc = locate(track, p);
          if (loc && loc.offsetKm < best) { best = loc.offsetKm; at = p; }
        }
      } else if (typeof e.lat === "number") at = [e.lon, e.lat];
      else if (e.center) at = [e.center.lon, e.center.lat];
      if (!at) continue;
      const kind = osmKind(t);
      out.push({
        key: `osm:${e.type}/${e.id}`,
        name,
        kind,
        at,
        text: osmText(t, kind),
        source: "osm",
        wiki: typeof t.wikipedia === "string" && t.wikipedia.startsWith("en:") ? t.wikipedia.slice(3) : undefined,
        url: `https://www.openstreetmap.org/${e.type}/${e.id}`,
      });
    }
  }, deadline);
}

/* ---------------- Wikipedia ---------------- */

async function fromWikipedia(track: Track, out: Cand[], deadline: number) {
  const step = Math.max(9, track.total / 140);
  const seen = new Map<number, { title: string; at: LL }>();
  await pool(samples(track, step), 8, async (p) => {
    const u = `${WIKI}?action=query&format=json&list=geosearch&gscoord=${p[1]}|${p[0]}&gsradius=${Math.min(10000, Math.round(step * 1000 * 0.75 + 1500))}&gslimit=100`;
    const j = await (await tfetch(u, {}, 10000)).json();
    for (const g of j?.query?.geosearch ?? []) {
      if (seen.has(g.pageid)) continue;
      const at: LL = [g.lon, g.lat];
      const loc = locate(track, at);
      if (loc && loc.offsetKm <= MAX_OFFSET_KM) seen.set(g.pageid, { title: g.title, at });
    }
  }, deadline);

  // Classify cheaply with short descriptions, then fetch summaries only for the keepers.
  const ids = [...seen.keys()];
  const keep: { id: number; kind: WindowKind }[] = [];
  const batches: number[][] = [];
  for (let i = 0; i < ids.length; i += 50) batches.push(ids.slice(i, i + 50));
  await pool(batches, 6, async (b) => {
    const j = await (await tfetch(`${WIKI}?action=query&format=json&prop=description&pageids=${b.join("|")}`, {}, 10000)).json();
    for (const pg of Object.values(j?.query?.pages ?? {}) as any[]) {
      const kind = kindFromText(`${pg.title} ${pg.description ?? ""}`);
      if (kind) keep.push({ id: pg.pageid, kind });
    }
  }, deadline);

  const kindOf = new Map(keep.map((k) => [k.id, k.kind]));
  const kb: number[][] = [];
  for (let i = 0; i < keep.length && i < 400; i += 20) kb.push(keep.slice(i, i + 20).map((k) => k.id));
  await pool(kb, 6, async (b) => {
    const u = `${WIKI}?action=query&format=json&prop=extracts|pageimages&exintro=1&explaintext=1&exsentences=2&exlimit=20&piprop=thumbnail&pithumbsize=600&pageids=${b.join("|")}`;
    const j = await (await tfetch(u, {}, 10000)).json();
    for (const pg of Object.values(j?.query?.pages ?? {}) as any[]) {
      const s = seen.get(pg.pageid);
      const kind = kindOf.get(pg.pageid);
      if (!s || !kind || !pg.extract) continue;
      out.push({
        key: `wiki:${pg.pageid}`,
        pageid: pg.pageid,
        name: pg.title,
        kind,
        at: s.at,
        text: pg.extract,
        img: pg.thumbnail?.source,
        url: `https://en.wikipedia.org/?curid=${pg.pageid}`,
        source: "wikipedia",
      });
    }
  }, deadline);
}

/** Fill in Wikipedia summaries for OSM features tagged with an English Wikipedia article. */
async function enrichFromWikipedia(items: Cand[], deadline: number) {
  const need = items.filter((c) => c.wiki && c.source === "osm");
  const batches: Cand[][] = [];
  for (let i = 0; i < need.length && i < 200; i += 20) batches.push(need.slice(i, i + 20));
  await pool(batches, 4, async (b) => {
    const titles = b.map((c) => c.wiki!).join("|");
    const u = `${WIKI}?action=query&format=json&redirects=1&prop=extracts|pageimages&exintro=1&explaintext=1&exsentences=2&exlimit=20&piprop=thumbnail&pithumbsize=600&titles=${encodeURIComponent(titles)}`;
    const j = await (await tfetch(u, {}, 8000)).json();
    const alias = new Map<string, string>();
    for (const r of [...(j?.query?.normalized ?? []), ...(j?.query?.redirects ?? [])]) alias.set(r.from, r.to);
    const byTitle = new Map<string, any>();
    for (const pg of Object.values(j?.query?.pages ?? {}) as any[]) byTitle.set(pg.title, pg);
    for (const c of b) {
      let t = c.wiki!.replace(/_/g, " ");
      for (let i = 0; i < 3 && alias.has(t); i++) t = alias.get(t)!;
      const pg = byTitle.get(t) ?? byTitle.get(alias.get(c.wiki!) ?? "");
      if (!pg?.extract) continue;
      c.text = pg.extract;
      c.img = pg.thumbnail?.source ?? c.img;
      c.url = `https://en.wikipedia.org/?curid=${pg.pageid}`;
      c.pageid = pg.pageid;
    }
  }, deadline);
}

/* ---------------- Bharat Atlas ---------------- */

const BA_LAYERS: { id: string; kind: WindowKind }[] = [
  { id: "wris_rivers", kind: "river" },
  { id: "wris_dams", kind: "dam" },
  { id: "wris_reservoirs", kind: "lake" },
  { id: "gs_wildlife", kind: "wildlife" },
];

// ICOLD dam type codes used by India-WRIS.
const DAM_TYPES: Record<string, string> = {
  TE: "Earthfill", ER: "Rockfill", PG: "Concrete gravity", VA: "Arch", MV: "Multiple-arch",
  CB: "Buttress", BM: "Masonry", "TE/PG": "Earth and concrete", "PG/TE": "Concrete and earth",
};

async function loadWildlifeInfo(deadline: number) {
  if (wildlifeInfo && Date.now() - wildlifeInfo.at < 86400000) return wildlifeInfo.byName;
  const byName = new Map<string, any>();
  try {
    const r = await tfetch(`${BHARATLAS}/layers/gs_wildlife/query?select=name,category,esta_year,area_sqkm,habitat,animals,best_time&limit=1000`, {}, Math.max(1000, Math.min(10000, deadline - Date.now())));
    const j = await r.json();
    for (const row of j?.data?.rows ?? []) if (row?.name) byName.set(norm(row.name.replace(/\b(wildlife sanctuary|sanctuary|national park|tiger reserve)\b/gi, "")), row);
    wildlifeInfo = { at: Date.now(), byName };
  } catch {}
  return byName;
}

function wildlifeText(w: any): string {
  const first = (s?: string, n = 3) => (s ? s.split(/[,;]/).map((x) => x.replace(/\(.*?\)/g, "").trim()).filter(Boolean).slice(0, n).join(", ") : "");
  return [
    `${w.category || "Protected area"}${w.esta_year ? ` set up in ${w.esta_year}` : ""}${w.area_sqkm && Number(w.area_sqkm) > 0 ? `, ${Math.round(Number(w.area_sqkm))} sq km` : ""}`,
    w.habitat ? `Habitat: ${first(w.habitat, 2)}` : "",
    w.animals ? `Look out for ${first(w.animals)}` : "",
    w.best_time ? `Best season: ${w.best_time}` : "",
  ].filter(Boolean).join(". ");
}

function baName(p: any): string | undefined {
  const n = p?.name || p?.dm_name || p?.rivname || p?.res_name || p?.wbname || p?.resname || p?.reservoir_name;
  return typeof n === "string" && n.trim() ? n.trim() : undefined;
}

async function fromBharatAtlas(track: Track, out: Cand[], deadline: number) {
  const pts = samples(track, Math.max(25, track.total / 12)).slice(0, 12);
  const jobs = pts.flatMap((p) => BA_LAYERS.map((l) => ({ p, l }))).slice(0, 48);
  await pool(jobs, 4, async ({ p, l }) => {
    const r = await tfetch(`${BHARATLAS}/nearby?lat=${p[1].toFixed(4)}&lng=${p[0].toFixed(4)}&layer=${l.id}&radius_km=${MAX_OFFSET_KM}&limit=10`, {}, 9000);
    if (!r.ok) return;
    const j = await r.json();
    for (const f of j?.features ?? []) {
      const name = baName(f.properties);
      if (!name || typeof f._lat !== "number" || typeof f._lng !== "number") continue;
      const pr = f.properties;
      let text = "";
      if (l.kind === "dam") text = [`${DAM_TYPES[pr.dm_type] ?? ""}${DAM_TYPES[pr.dm_type] ? " dam" : "Dam"}`, pr.dm_height ? `${pr.dm_height} m high` : "", pr.dm_cmp_yr ? `completed ${pr.dm_cmp_yr}` : ""].filter(Boolean).join(", ");
      else if (l.kind === "river") text = `River${pr.ba_name ? ` in the ${pr.ba_name} basin` : ""}`;
      else if (l.kind === "wildlife") text = wildlifeText(pr);
      else text = "Reservoir";
      out.push({ key: `ba:${l.id}:${name}`, name: l.kind === "river" && !/river/i.test(name) ? `${name} River` : name, kind: l.kind, at: [f._lng, f._lat], text, source: "bharatlas" });
    }
  }, deadline);
}

/* ---------------- Merge ---------------- */

function finalize(track: Track, cands: Cand[], wildlife: Map<string, any>): WindowItem[] {
  const prio = { wikipedia: 0, osm: 1, bharatlas: 2 } as const;
  cands.sort((a, b) => prio[a.source] - prio[b.source]);
  const kept: WindowItem[] = [];
  const pageSeen = new Set<number>();
  for (const c of cands) {
    if (c.pageid && pageSeen.has(c.pageid)) continue;
    const loc = locate(track, c.at);
    if (!loc || loc.offsetKm > MAX_OFFSET_KM) continue;
    const n = norm(c.name);
    const radius = c.kind === "river" || c.kind === "wildlife" ? 8 : 1.5;
    const dup = n && kept.find((k) => norm(k.name) === n && hav(k.at, c.at) <= radius);
    if (dup) {
      if (dup.text.length < c.text.length && c.source !== "bharatlas") dup.text = c.text;
      dup.img ??= c.img;
      if (c.kind === "river" && loc.offsetKm < dup.offsetKm) Object.assign(dup, { at: c.at, km: loc.km, side: loc.side, offsetKm: loc.offsetKm });
      continue;
    }
    if (c.pageid) pageSeen.add(c.pageid);
    let text = c.text;
    if (c.kind === "wildlife") {
      const w = wildlife.get(norm(c.name.replace(/\b(wildlife sanctuary|sanctuary|national park|tiger reserve)\b/gi, "")));
      if (w) text = c.source === "bharatlas" ? wildlifeText(w) : `${text} ${wildlifeText(w)}.`;
    }
    kept.push({
      id: c.key,
      name: c.name,
      kind: c.kind,
      at: c.at,
      km: Math.round(loc.km * 10) / 10,
      side: loc.side,
      offsetKm: Math.round(loc.offsetKm * 10) / 10,
      text,
      img: c.img,
      url: c.url,
      source: c.source,
    });
  }
  for (const k of kept) k.crossing = (k.kind === "river" || k.kind === "bridge") && k.offsetKm <= 0.3;
  // Long routes: keep the most interesting items, then present in travel order.
  const score = (k: WindowItem) => (k.source === "wikipedia" || k.img ? 2 : 0) + (k.kind === "town" ? -1 : 1) + (k.crossing ? 2 : 0);
  const cap = Math.max(60, Math.round(track.total / 4));
  return kept.sort((a, b) => score(b) - score(a)).slice(0, cap).sort((a, b) => a.km - b.km);
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const raw: LL[] = Array.isArray(body?.line)
    ? body.line.filter((p: any) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    : [];
  if (raw.length < 2) return Response.json({ error: "Need a track line with at least two points." }, { status: 400 });

  const all = ["wikipedia", "osm", "bharatlas"];
  const want = new Set<string>(Array.isArray(body?.sources) ? body.sources.filter((s: unknown) => all.includes(s as string)) : all);
  if (!want.size) return Response.json({ error: "Unknown sources." }, { status: 400 });

  const line = thin(raw, 0.5);
  const key = [...want].sort().join("+") + "@" + hash(thin(line, 5));
  const hit = cache.get(key);
  if (hit && hit.expiry > Date.now()) return Response.json({ items: hit.items, cached: true });

  const track = makeTrack(line);
  // OSM alone gets a longer budget: public Overpass servers are often slow.
  const budget = want.size === 1 && want.has("osm") ? OSM_ONLY_BUDGET_MS : SOURCE_BUDGET_MS;
  const deadline = Date.now() + budget;
  const cands: Cand[] = [];
  const wildlifeP = want.has("osm") || want.has("bharatlas") ? loadWildlifeInfo(deadline) : Promise.resolve(new Map());
  await Promise.race([
    Promise.allSettled([
      want.has("wikipedia") && fromWikipedia(track, cands, deadline),
      want.has("osm") && fromOverpass(track, cands, deadline),
      want.has("bharatlas") && fromBharatAtlas(track, cands, deadline),
    ]),
    new Promise((r) => setTimeout(r, budget + 2000)),
  ]);
  await enrichFromWikipedia(cands, Date.now() + 8000).catch(() => {});
  const wildlife = await Promise.race([wildlifeP, new Promise<Map<string, any>>((r) => setTimeout(() => r(new Map()), 1500))]);

  const items = finalize(track, [...cands], wildlife);
  const counts = { osm: 0, wikipedia: 0, bharatlas: 0 };
  for (const c of cands) counts[c.source]++;
  if (items.length) cache.set(key, { items, expiry: Date.now() + 12 * 3600000 });
  return Response.json({ items, sources: counts, total: Math.round(track.total) });
}
