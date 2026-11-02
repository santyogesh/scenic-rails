import type { LL } from "./geo";
import type { Side } from "./side";

export type WindowKind =
  | "river" | "waterfall" | "lake" | "dam" | "fort" | "worship" | "wildlife"
  | "hill" | "beach" | "bridge" | "heritage" | "town" | "station" | "sight";

export type WindowItem = {
  id: string;
  name: string;
  kind: WindowKind;
  at: LL;
  km: number;
  side: Side;
  offsetKm: number;
  crossing?: boolean;
  text: string;
  img?: string;
  url?: string;
  source: "osm" | "wikipedia" | "bharatlas";
};

export const KIND_LABEL: Record<WindowKind, string> = {
  river: "River", waterfall: "Waterfall", lake: "Lake", dam: "Dam", fort: "Fort",
  worship: "Temple / shrine", wildlife: "Wildlife", hill: "Hills", beach: "Coast",
  bridge: "Bridge", heritage: "Heritage", town: "Town", station: "Station", sight: "Sight",
};

const BIG_KINDS = new Set<WindowKind>(["hill", "fort", "lake", "river", "dam", "wildlife", "waterfall"]);

/** How far from the track a landmark of this kind is still worth showing. */
export const maxOffsetKm = (kind: WindowKind) => (BIG_KINDS.has(kind) ? 10 : 5);
export const MAX_SEARCH_KM = 10;

const score = (k: WindowItem) => (k.source === "wikipedia" || k.img ? 2 : 0) + (k.kind === "town" || k.kind === "station" ? -1 : 1) + (k.crossing ? 2 : 0);

/** Keep the most interesting items, half the budget per side and spread along the route; returned in travel order. */
export function pickBalanced(items: WindowItem[], totalKm: number): WindowItem[] {
  const cap = Math.max(150, Math.round(totalKm / 1.5));
  const out: WindowItem[] = [];
  for (const side of ["left", "right"] as const) {
    const buckets = new Map<number, WindowItem[]>();
    for (const it of items) {
      if (it.side !== side) continue;
      const b = Math.floor(it.km / 10);
      if (!buckets.has(b)) buckets.set(b, []);
      buckets.get(b)!.push(it);
    }
    const lists = [...buckets.values()].map((l) => l.sort((a, b) => score(b) - score(a)));
    let left = Math.ceil(cap / 2);
    for (let round = 0; left > 0; round++) {
      let took = false;
      for (const l of lists) {
        if (round < l.length && left > 0) { out.push(l[round]); left--; took = true; }
      }
      if (!took) break;
    }
  }
  return out.sort((a, b) => a.km - b.km);
}

/** Guess a landmark kind from free text (title + description). Returns null if it isn't worth showing. */
export function kindFromText(s: string): WindowKind | null {
  const t = s.toLowerCase();
  if (/\b(bombings?|attacks?|riots?|massacre|election|municipal corporation|crash|accident|disaster|incident|stampede|list of)\b/.test(t)) return null;
  if (/\b(railway station|railway junction|junction)\b/.test(t) && !/\b(metro|monorail|bus|road)\b/.test(t)) return "station";
  if (/\b((?<!hill )station|metro|village|school|college|university|hospital|constituency|neighbourhood|suburb|locality|company|census town|ward|road|airport|district of|tehsil|mandal|taluka|block|exchange|building|hotel|mall|stadium|cinema|office|bank|studio|industrial|hall|club|court)\b/.test(t) && !/\b(fort|temple|lake|river|waterfall|sanctuary|national park|dam)\b/.test(t)) return null;
  if (/\bwaterfalls?\b|\bfalls\b/.test(t)) return "waterfall";
  if (/\b(river|tributary)\b/.test(t)) return "river";
  if (/\b(dam|barrage|weir|anicut)\b/.test(t)) return "dam";
  if (/\b(lake|reservoir|lagoon|tank|wetland)\b/.test(t)) return "lake";
  if (/\b(fort|fortress|castle|palace|citadel|qila)\b/.test(t)) return "fort";
  if (/\b(national park|sanctuary|tiger reserve|biosphere|reserve forest|wildlife|bird)\b/.test(t)) return "wildlife";
  if (/\b(temple|mosque|masjid|church|cathedral|basilica|gurudwara|gurdwara|stupa|monastery|shrine|dargah|mandir|jain|math)\b/.test(t)) return "worship";
  if (/\b(peak|mountain|hills?|ghats|pass|valley|gorge|plateau|cliff|ravine)\b/.test(t)) return "hill";
  if (/\b(beach|coast|bay|island|cape|creek|estuary)\b/.test(t)) return "beach";
  if (/\b(bridge|viaduct|tunnel)\b/.test(t)) return "bridge";
  if (/\b(museum|monument|memorial|tomb|mausoleum|ruins|archaeological|caves?|heritage|ghat|stepwell|baori|vav|minar|gate)\b/.test(t)) return "heritage";
  if (/\b(city|town|municipality|capital)\b/.test(t)) return "town";
  if (/\b(viewpoint|attraction|park|garden)\b/.test(t)) return "sight";
  return null;
}

/** Landmark kind from OpenStreetMap tags. */
export function osmKind(t: Record<string, string>): WindowKind {
  if (t.railway === "station" || t.railway === "halt") return "station";
  if (t.railway === "rail" && t.bridge) return "bridge";
  if (["river", "canal", "stream"].includes(t.waterway)) return "river";
  if (t.waterway === "waterfall" || t.natural === "waterfall") return "waterfall";
  if (t.waterway === "dam") return "dam";
  if (t.natural === "water" || t.landuse === "reservoir") return "lake";
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

/** Short description of an OpenStreetMap feature from its tags. */
export function osmText(t: Record<string, string>, kind: WindowKind): string {
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
    case "station": bits.push(t.railway === "halt" ? "Railway halt" : "Railway station"); break;
    case "river": bits.push(t.waterway === "canal" ? "Canal" : t.waterway === "stream" ? "Stream" : "River"); break;
    default: bits.push(pretty(t.tourism || t.natural) || "Point of interest");
  }
  if (t.heritage) bits.push("Listed heritage site");
  return [...new Set(bits)].filter(Boolean).join(". ");
}

const normName = (s: string) =>
  s.toLowerCase().replace(/\(.*?\)|,.*$/g, "").replace(/\b(river|nadi|lake|dam|fort|temple|the)\b/g, "").replace(/[^a-z0-9]/g, "");

/** Merge result batches from different sources, dropping the same landmark seen twice. */
export function mergeItems(a: WindowItem[], b: WindowItem[]): WindowItem[] {
  const out = a.map((o) => ({ ...o }));
  for (const it of b) {
    const n = normName(it.name);
    const radiusKm = it.kind === "river" || it.kind === "wildlife" ? 8 : 1.5;
    const dup = out.find((o) => o.id === it.id || (n && normName(o.name) === n && Math.abs(o.km - it.km) <= radiusKm));
    if (dup) {
      if (!dup.img && it.img) dup.img = it.img;
      if (it.crossing && !dup.crossing) Object.assign(dup, { crossing: true, at: it.at, km: it.km, side: it.side, offsetKm: it.offsetKm });
      continue;
    }
    out.push(it);
  }
  return out.sort((x, y) => x.km - y.km);
}

export const sideText = (it: Pick<WindowItem, "offsetKm" | "side" | "crossing">) =>
  it.crossing ? "Crossing under the train" : it.offsetKm < 0.2 ? `Right beside the track, on your ${it.side}` : `${it.offsetKm.toFixed(1)} km to your ${it.side}`;
