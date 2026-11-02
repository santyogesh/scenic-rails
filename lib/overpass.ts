export const UA = "ScenicRails/1.0 (https://github.com/santyogesh/scenic-rails)";
export const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

export async function tfetch(url: string, init: RequestInit = {}, ms = 12000) {
  return fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers || {}) }, signal: AbortSignal.timeout(ms) });
}

export async function overpassQuery(q: string, deadline: number): Promise<any[] | null> {
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
