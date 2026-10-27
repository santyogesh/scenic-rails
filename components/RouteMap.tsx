"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { hav, LL } from "@/lib/geo";
import type { Sight } from "@/lib/rail";
import type { Route } from "@/data/routes";

export type RouteMapProps = {
  line?: LL[];
  sights?: Sight[];
  onPick?: (s: Sight) => void;
  route?: Route;
  active?: number;
  onSelect?: (index: number) => void;
};

export default function RouteMap({ line: propLine, sights: propSights, onPick, route, active, onSelect }: RouteMapProps) {
  const rawLine = propLine ?? route?.line ?? [];
  const line = useMemo(() => {
    return rawLine.filter((p): p is LL => Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number" && !isNaN(p[0]) && !isNaN(p[1]));
  }, [rawLine]);

  const sights = useMemo(() => {
    return (propSights ?? route?.sights ?? []).filter((s) => s && Array.isArray(s.at) && typeof s.at[0] === "number" && typeof s.at[1] === "number");
  }, [propSights, route?.sights]);

  const box = useRef<HTMLDivElement>(null), map = useRef<maplibregl.Map | null>(null), raf = useRef(0);
  const animRaf = useRef(0);
  const [riding, setRiding] = useState(false);

  useEffect(() => {
    if (!box.current || line.length < 2) return;
    const b = line.reduce((a, c) => a.extend(c), new maplibregl.LngLatBounds(line[0], line[0]));
    const m = new maplibregl.Map({
      container: box.current, bounds: b, fitBoundsOptions: { padding: 90 }, pitch: 55, maxPitch: 80,
      style: {
        version: 8,
        sources: {
          osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" },
          dem: { type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], tileSize: 256, encoding: "terrarium", maxzoom: 14 },
        },
        layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-saturation": -0.5, "raster-brightness-max": 0.6, "raster-contrast": 0.25 } }],
        terrain: { source: "dem", exaggeration: 1.6 },
      },
    });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    sights.forEach((s, idx) => {
      const el = document.createElement("button");
      el.className = "pin"; el.title = s.name; el.setAttribute("aria-label", s.name);
      el.onclick = () => {
        onPick?.(s);
        onSelect?.(idx);
      };
      new maplibregl.Marker({ element: el }).setLngLat(s.at).addTo(m);
    });
    m.on("load", () => {
      if (line.length < 2) return;
      const feat = (c: LL[]) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: c } });
      m.addSource("r", { type: "geojson", data: feat([line[0], line[0]]) });
      m.addLayer({ id: "glow", type: "line", source: "r", paint: { "line-color": "#5eead4", "line-width": 14, "line-blur": 12, "line-opacity": 0.6 } });
      m.addLayer({ id: "core", type: "line", source: "r", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffd37a", "line-width": 4 } });
      const n = line.length - 1, t0 = performance.now(), dur = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 3500;
      const tick = (now: number) => {
        if (!map.current || line.length < 2) return;
        const t = Math.min((now - t0) / dur, 1), k = t * n, i = Math.min(Math.floor(k), n - 1);
        const pts = line.slice(0, i + 1);
        if (i < n) {
          const a = line[i], c = line[i + 1];
          if (a && c && typeof a[0] === "number" && typeof c[0] === "number") {
            const f = k - i;
            pts.push([a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f]);
          }
        }
        const src = m.getSource("r") as maplibregl.GeoJSONSource | undefined;
        if (src) src.setData(feat(pts.length >= 2 ? pts : [line[0], line[1]]));
        if (t < 1) animRaf.current = requestAnimationFrame(tick);
      };
      animRaf.current = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(animRaf.current);
      cancelAnimationFrame(raf.current);
      m.remove();
      map.current = null;
    };
  }, [line, sights]);

  useEffect(() => {
    if (active !== undefined && active >= 0 && sights[active] && map.current) {
      map.current.flyTo({ center: sights[active].at, zoom: 12, speed: 1.2 });
    }
  }, [active, sights]);

  const ride = () => {
    const m = map.current;
    if (!m || line.length < 2) return;
    if (riding) { cancelAnimationFrame(raf.current); setRiding(false); return; }
    setRiding(true);
    const cum = [0]; line.forEach((p, i) => { if (i) cum.push(cum[i - 1] + hav(line[i - 1], p)); });
    const total = cum[cum.length - 1];
    if (!total || isNaN(total)) { setRiding(false); return; }
    const dur = Math.min(90000, Math.max(25000, total * 60)), t0 = performance.now();
    let k = 0;
    const at = (d: number): LL => {
      while (k < cum.length - 2 && cum[k + 1] < d) k++;
      const span = (cum[k + 1] - cum[k]) || 1;
      const f = (d - cum[k]) / span;
      const p0 = line[k] || line[0];
      const p1 = line[k + 1] || p0;
      return [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f];
    };
    const step = (now: number) => {
      const d = Math.min((now - t0) / dur, 1) * total, p = at(d), q = at(Math.min(d + Math.max(2, total / 80), total));
      m.jumpTo({ center: p, bearing: (Math.atan2(q[0] - p[0], q[1] - p[1]) * 180) / Math.PI, pitch: 68, zoom: 12 });
      if (d < total) raf.current = requestAnimationFrame(step); else setRiding(false);
    };
    raf.current = requestAnimationFrame(step);
  };
  return (<><div ref={box} className="map" /><button className="ride" onClick={ride}>{riding ? "Stop" : "Ride the route"}</button></>);
}

