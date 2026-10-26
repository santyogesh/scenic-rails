"use client";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Route } from "@/data/routes";

export default function RouteMap({ route, active, onSelect }: { route: Route; active: number; onSelect: (i: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const pins = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const b = route.line.reduce((a, c) => a.extend(c), new maplibregl.LngLatBounds(route.line[0], route.line[0]));
    const m = new maplibregl.Map({
      container: box.current!, bounds: b, fitBoundsOptions: { padding: 70 },
      style: { version: 8, sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } }, layers: [{ id: "osm", type: "raster", source: "osm" }] },
    });
    map.current = m;
    route.sights.forEach((s, i) => {
      const el = document.createElement("button");
      el.className = "pin"; el.setAttribute("aria-label", s.name);
      el.onclick = () => onSelect(i);
      pins.current[i] = el;
      new maplibregl.Marker({ element: el }).setLngLat(s.at).addTo(m);
    });
    m.on("load", () => {
      m.addSource("r", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [route.line[0], route.line[0]] } } });
      m.addLayer({ id: "r", type: "line", source: "r", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#1d5c4a", "line-width": 5 } });
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const n = route.line.length - 1, t0 = performance.now(), dur = reduce ? 1 : 3000;
      const tick = (now: number) => {
        const t = Math.min((now - t0) / dur, 1), k = t * n, i = Math.min(Math.floor(k), n);
        const pts = route.line.slice(0, i + 1);
        if (i < n) { const a = route.line[i], c = route.line[i + 1], f = k - i; pts.push([a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f]); }
        (m.getSource("r") as maplibregl.GeoJSONSource).setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: pts } });
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return () => m.remove();
  }, [route]);

  useEffect(() => {
    pins.current.forEach((p, i) => p?.classList.toggle("on", i === active));
    if (active >= 0) map.current?.flyTo({ center: route.sights[active].at, zoom: 9, speed: 0.8 });
  }, [active, route]);

  return <div ref={box} className="map" />;
}
