"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { hav, LL } from "@/lib/geo";
import type { Sight } from "@/lib/rail";

export default function RouteMap({ line, sights, onPick }: { line: LL[]; sights: Sight[]; onPick: (s: Sight) => void }) {
  const box = useRef<HTMLDivElement>(null), map = useRef<maplibregl.Map | null>(null), raf = useRef(0);
  const [riding, setRiding] = useState(false);

  useEffect(() => {
    const b = line.reduce((a, c) => a.extend(c), new maplibregl.LngLatBounds(line[0], line[0]));
    const m = new maplibregl.Map({
      container: box.current!, bounds: b, fitBoundsOptions: { padding: 90 }, pitch: 55, maxPitch: 80,
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
    sights.forEach((s) => {
      const el = document.createElement("button");
      el.className = "pin"; el.title = s.name; el.setAttribute("aria-label", s.name);
      el.onclick = () => onPick(s);
      new maplibregl.Marker({ element: el }).setLngLat(s.at).addTo(m);
    });
    m.on("load", () => {
      const feat = (c: LL[]) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: c } });
      m.addSource("r", { type: "geojson", data: feat([line[0], line[0]]) });
      m.addLayer({ id: "glow", type: "line", source: "r", paint: { "line-color": "#5eead4", "line-width": 14, "line-blur": 12, "line-opacity": 0.6 } });
      m.addLayer({ id: "core", type: "line", source: "r", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffd37a", "line-width": 4 } });
      const n = line.length - 1, t0 = performance.now(), dur = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 3500;
      const tick = (now: number) => {
        const t = Math.min((now - t0) / dur, 1), k = t * n, i = Math.min(Math.floor(k), n);
        const pts = line.slice(0, i + 1);
        if (i < n) { const a = line[i], c = line[i + 1], f = k - i; pts.push([a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f]); }
        (m.getSource("r") as maplibregl.GeoJSONSource).setData(feat(pts));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return () => { cancelAnimationFrame(raf.current); m.remove(); };
  }, [line, sights]);

  const ride = () => {
    const m = map.current!;
    if (riding) { cancelAnimationFrame(raf.current); setRiding(false); return; }
    setRiding(true);
    const cum = [0]; line.forEach((p, i) => { if (i) cum.push(cum[i - 1] + hav(line[i - 1], p)); });
    const total = cum[cum.length - 1], dur = Math.min(90000, Math.max(25000, total * 60)), t0 = performance.now();
    let k = 0;
    const at = (d: number): LL => { while (k < cum.length - 2 && cum[k + 1] < d) k++; const f = (d - cum[k]) / (cum[k + 1] - cum[k] || 1); return [line[k][0] + (line[k + 1][0] - line[k][0]) * f, line[k][1] + (line[k + 1][1] - line[k][1]) * f]; };
    const step = (now: number) => {
      const d = Math.min((now - t0) / dur, 1) * total, p = at(d), q = at(Math.min(d + Math.max(2, total / 80), total));
      m.jumpTo({ center: p, bearing: (Math.atan2(q[0] - p[0], q[1] - p[1]) * 180) / Math.PI, pitch: 68, zoom: 12 });
      if (d < total) raf.current = requestAnimationFrame(step); else setRiding(false);
    };
    raf.current = requestAnimationFrame(step);
  };
  return (<><div ref={box} className="map" /><button className="ride" onClick={ride}>{riding ? "Stop" : "Ride the route"}</button></>);
}
