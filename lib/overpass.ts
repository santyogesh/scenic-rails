export const UA = "ScenicRails/1.0 (https://github.com/santyogesh/scenic-rails)";
export const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

export async function tfetch(url: string, init: RequestInit = {}, ms = 12000) {
  return fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers || {}) }, signal: AbortSignal.timeout(ms) });
}

async function ask(url: string, q: string, ms: number, signal: AbortSignal): Promise<any[]> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(q),
    signal: AbortSignal.any([signal, AbortSignal.timeout(ms)]),
  });
  if (!r.ok) throw new Error(`overpass ${r.status}`);
  const j = await r.json();
  if (!Array.isArray(j?.elements)) throw new Error("overpass: no elements");
  return j.elements;
}

/** Ask two mirrors at once and take whichever answers first; then the other two; then back off and retry while time remains. */
export async function overpassQuery(q: string, deadline: number): Promise<any[] | null> {
  const start = Math.floor(Math.random() * OVERPASS.length);
  const order = OVERPASS.map((_, i) => OVERPASS[(start + i) % OVERPASS.length]);
  const groups = [order.slice(0, 2), order.slice(2)].filter((g) => g.length);
  for (let attempt = 0; Date.now() < deadline - 3000; attempt++) {
    const group = groups[attempt % groups.length];
    const ctl = new AbortController();
    const ms = Math.min(25000, deadline - Date.now());
    try {
      return await Promise.any(group.map((url) => ask(url, q, ms, ctl.signal)));
    } catch {
    } finally {
      ctl.abort();
    }
    // Busy public servers reject fast; wait before going round again.
    if (attempt % groups.length === groups.length - 1) await new Promise((r) => setTimeout(r, Math.min(8000, deadline - 3000 - Date.now(), 1000 * 2 ** Math.floor(attempt / groups.length))));
  }
  return null;
}
