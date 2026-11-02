import type { LL } from "./geo";

export type RailRoute = { line: LL[]; approx: [number, number][] };

/** Any gap between consecutive points longer than `maxGapKm` means the line doesn't follow real track. */
export function coarse(line: LL[], maxGapKm = 3): boolean {
  const r = Math.PI / 180;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const dx = (b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * r) * 111.32, dy = (b[1] - a[1]) * 110.57;
    if (Math.hypot(dx, dy) > maxGapKm) return true;
  }
  return false;
}

export const railUrl = (points: LL[], snapKm?: number) =>
  `/api/rail?p=${points.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join(";")}${snapKm ? `&snap=${snapKm}` : ""}`;
