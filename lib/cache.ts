import { Redis } from "@upstash/redis";

const VERSION = "v1";
const TIMEOUT_MS = 1500;
const MEMORY_MAX = 2000;

let client: Redis | null | undefined;
const memory = new Map<string, { value: unknown; expiry: number }>();

/** Vercel's Upstash integration sets KV_REST_API_*; a direct Upstash database sets UPSTASH_REDIS_REST_*. */
function redis() {
  if (client === undefined) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    client = url && token ? new Redis({ url, token, retry: { retries: 1 } }) : null;
  }
  return client;
}

export const cacheKey = (ns: "win" | "near", key: string) => `${ns}:${VERSION}:${key}`;

function withTimeout<T>(p: Promise<T>): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), TIMEOUT_MS))]);
}

/** Without Redis configured, falls back to a per-instance memory cache. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = redis();
  if (!r) {
    const hit = memory.get(key);
    if (hit && hit.expiry > Date.now()) return hit.value as T;
    memory.delete(key);
    return null;
  }
  try {
    return await withTimeout(r.get<T>(key));
  } catch (e) {
    console.warn("[cache] get failed:", (e as Error).message);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSec: number) {
  const r = redis();
  if (!r) {
    if (memory.size > MEMORY_MAX) memory.clear();
    memory.set(key, { value, expiry: Date.now() + ttlSec * 1000 });
    return;
  }
  try {
    await withTimeout(r.set(key, value, { ex: ttlSec }));
  } catch (e) {
    console.warn("[cache] set failed:", (e as Error).message);
  }
}
