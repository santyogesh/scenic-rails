import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { NearbyItem } from "@/lib/nearby";
import type { WindowItem } from "@/lib/window";

const ROUTE_MAX_AGE_DAYS = 30;
const CELL_MAX_AGE_DAYS = 7;

type Landmark = Pick<WindowItem, "id" | "name" | "kind" | "at" | "text" | "img" | "url" | "source">;

let client: NeonQueryFunction<false, false> | null | undefined;

/** Null when DATABASE_URL isn't configured, so callers fall back to fetching upstream. */
function db() {
  if (client === undefined) client = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
  return client;
}

async function safe<T>(label: string, fn: (sql: NeonQueryFunction<false, false>) => Promise<T>): Promise<T | null> {
  const sql = db();
  if (!sql) return null;
  try {
    return await fn(sql);
  } catch (e) {
    console.warn(`[db] ${label} failed:`, (e as Error).message);
    return null;
  }
}

function upsertLandmarks(sql: NeonQueryFunction<false, false>, items: Landmark[]) {
  const uniq = [...new Map(items.map((i) => [i.id, i])).values()];
  return sql`
    INSERT INTO landmarks (id, name, kind, lat, lng, text, img, url, source)
    SELECT * FROM unnest(
      ${uniq.map((i) => i.id)}::text[], ${uniq.map((i) => i.name)}::text[], ${uniq.map((i) => i.kind)}::text[],
      ${uniq.map((i) => i.at[1])}::float8[], ${uniq.map((i) => i.at[0])}::float8[], ${uniq.map((i) => i.text)}::text[],
      ${uniq.map((i) => i.img ?? null)}::text[], ${uniq.map((i) => i.url ?? null)}::text[], ${uniq.map((i) => i.source)}::text[]
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, kind = EXCLUDED.kind, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
      text = CASE WHEN EXCLUDED.text <> '' THEN EXCLUDED.text ELSE landmarks.text END,
      img = COALESCE(EXCLUDED.img, landmarks.img), url = COALESCE(EXCLUDED.url, landmarks.url),
      last_seen = now()`;
}

const toLandmark = (r: Record<string, any>): Landmark => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  at: [r.lng, r.lat],
  text: r.text,
  ...(r.img ? { img: r.img } : {}),
  ...(r.url ? { url: r.url } : {}),
  source: r.source,
});

/** Landmarks previously found along this track, in travel order; null if unknown or stale. */
export function getRoute(key: string): Promise<WindowItem[] | null> {
  return safe("getRoute", async (sql) => {
    const rows = await sql`
      SELECT l.*, rl.km, rl.side, rl.offset_km, rl.crossing
      FROM routes r
      JOIN route_landmarks rl ON rl.route_key = r.key
      JOIN landmarks l ON l.id = rl.landmark_id
      WHERE r.key = ${key} AND r.updated_at > now() - make_interval(days => ${ROUTE_MAX_AGE_DAYS})
      ORDER BY rl.km`;
    if (!rows.length) return null;
    return rows.map((r) => ({
      ...toLandmark(r),
      km: r.km,
      side: r.side,
      offsetKm: r.offset_km,
      ...(r.crossing ? { crossing: true } : {}),
    })) as WindowItem[];
  });
}

export async function saveRoute(key: string, sources: string, totalKm: number, items: WindowItem[]) {
  if (!items.length) return;
  await safe("saveRoute", (sql) =>
    sql.transaction([
      upsertLandmarks(sql, items),
      sql`
        INSERT INTO routes (key, sources, total_km, item_count)
        VALUES (${key}, ${sources}, ${totalKm}, ${items.length})
        ON CONFLICT (key) DO UPDATE SET
          sources = EXCLUDED.sources, total_km = EXCLUDED.total_km,
          item_count = EXCLUDED.item_count, updated_at = now()`,
      sql`DELETE FROM route_landmarks WHERE route_key = ${key}`,
      sql`
        INSERT INTO route_landmarks (route_key, landmark_id, km, side, offset_km, crossing)
        SELECT ${key}, * FROM unnest(
          ${items.map((i) => i.id)}::text[], ${items.map((i) => i.km)}::float8[], ${items.map((i) => i.side)}::text[],
          ${items.map((i) => i.offsetKm)}::float8[], ${items.map((i) => !!i.crossing)}::bool[]
        )
        ON CONFLICT DO NOTHING`,
    ])
  );
}

/** Landmarks previously found around this ~1 km cell; null if unknown or stale. */
export function getCell(cell: string): Promise<NearbyItem[] | null> {
  return safe("getCell", async (sql) => {
    const rows = await sql`
      SELECT l.*
      FROM nearby_cells c
      LEFT JOIN landmarks l ON l.id = ANY (c.landmark_ids)
      WHERE c.cell = ${cell} AND c.updated_at > now() - make_interval(days => ${CELL_MAX_AGE_DAYS})`;
    if (!rows.length) return null;
    return rows.filter((r) => r.id).map(toLandmark) as NearbyItem[];
  });
}

export async function saveCell(cell: string, items: NearbyItem[]) {
  await safe("saveCell", (sql) =>
    sql.transaction([
      ...(items.length ? [upsertLandmarks(sql, items)] : []),
      sql`
        INSERT INTO nearby_cells (cell, landmark_ids)
        VALUES (${cell}, ${items.map((i) => i.id)}::text[])
        ON CONFLICT (cell) DO UPDATE SET landmark_ids = EXCLUDED.landmark_ids, updated_at = now()`,
    ])
  );
}
