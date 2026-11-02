import type { LL } from "./geo";
import type { Stop } from "./rail";

// Unofficial: erail.in's public pages, the same data its own site and app use. No key or quota, but the
// format can change without notice, so every parse is defensive and callers must have a fallback.
const BASE = "https://erail.in";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const CACHE_MS = 12 * 3600000;

export type ErailTrain = {
  number: string;
  name: string;
  type: string;
  from: string;
  to: string;
  distance: number;
  /** Minutes, origin departure to destination arrival. */
  duration: number;
  stops: Stop[];
};

const cache = new Map<string, { data: ErailTrain | null; expiry: number }>();

async function get(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`erail ${r.status}`);
  return r.text();
}

const hhmm = (s?: string) => (s && /^\d{1,2}\.\d{2}$/.test(s) ? s.replace(".", ":").padStart(5, "0") : undefined);
const title = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

export async function erailTrain(no: string): Promise<ErailTrain | null> {
  const hit = cache.get(no);
  if (hit && hit.expiry > Date.now()) return hit.data;

  const info = await get(`${BASE}/rail/getTrains.aspx?TrainNo=${encodeURIComponent(no)}&DataSource=0&Language=0&Cache=true`);
  const [head, rest] = info.split("~~~~~~~~");
  if (!rest || /Train not found/i.test(head)) {
    cache.set(no, { data: null, expiry: Date.now() + CACHE_MS });
    return null;
  }
  const a = head.split("~").filter(Boolean);
  if (a[1]?.length > 6) a.shift();
  const b = rest.split("~").filter(Boolean);
  const trainId = b[12];
  if (!a[1] || !/^\d+$/.test(trainId ?? "")) throw new Error("erail: unexpected train format");

  const routeTxt = await get(`${BASE}/data.aspx?Action=TRAINROUTE&Password=2012&Data1=${trainId}&Data2=0&Cache=true`);
  const stops: Stop[] = routeTxt
    .slice(routeTxt.indexOf("^") + 1)
    .split("~^")
    .map((r) => r.split("~"))
    .filter((f) => f[1] && f[2] && Number.isFinite(parseFloat(f[14])) && Number.isFinite(parseFloat(f[15])))
    .map((f) => ({
      name: f[2],
      code: f[1],
      at: [parseFloat(f[15]), parseFloat(f[14])] as LL,
      arrival: hhmm(f[3]),
      departure: hhmm(f[4]),
      distance: Number.isFinite(parseInt(f[6])) ? parseInt(f[6]) : undefined,
      sequence: Number.isFinite(parseInt(f[0])) ? parseInt(f[0]) : undefined,
    }));
  if (stops.length < 2) throw new Error("erail: no route");

  const [h, m] = (a[13] ?? "0.0").split(".").map(Number);
  const data: ErailTrain = {
    number: a[1].replace("^", ""),
    name: title(a[2] ?? ""),
    type: title(b[11] ?? ""),
    from: a[3],
    to: a[5],
    distance: parseInt(b[18]) || stops[stops.length - 1].distance || 0,
    duration: (h || 0) * 60 + (m || 0),
    stops,
  };
  cache.set(no, { data, expiry: Date.now() + CACHE_MS });
  return data;
}
