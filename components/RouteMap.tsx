"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { hav, LL } from "@/lib/geo";
import type { Sight, Stop } from "@/lib/rail";
import type { Route } from "@/data/routes";

export type RouteMapProps = {
  line?: LL[];
  stops?: Stop[];
  sights?: Sight[];
  onPick?: (s: Sight) => void;
  route?: Route;
  active?: number;
  onSelect?: (index: number) => void;
};

export default function RouteMap({ line: propLine, stops: propStops, sights: propSights, onPick, route, active, onSelect }: RouteMapProps) {
  const rawLine = propLine ?? route?.line ?? [];
  const line = useMemo(() => {
    return rawLine.filter((p): p is LL => Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number" && !isNaN(p[0]) && !isNaN(p[1]));
  }, [rawLine]);

  const stops = useMemo(() => {
    return (propStops ?? route?.stops ?? []).filter((s) => s && Array.isArray(s.at) && typeof s.at[0] === "number" && typeof s.at[1] === "number");
  }, [propStops, route?.stops]);

  const sights = useMemo(() => {
    return (propSights ?? route?.sights ?? []).filter((s) => s && Array.isArray(s.at) && typeof s.at[0] === "number" && typeof s.at[1] === "number");
  }, [propSights, route?.sights]);

  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const stopMarkers = useRef<maplibregl.Marker[]>([]);
  const sightMarkers = useRef<maplibregl.Marker[]>([]);
  const raf = useRef(0);
  const animRaf = useRef(0);
  const [riding, setRiding] = useState(false);
  const [activeStopIdx, setActiveStopIdx] = useState<number | null>(null);

  // 1. Initialize OpenStreetMap map & draw rail track
  useEffect(() => {
    if (!box.current || line.length < 2) return;
    const b = line.reduce((a, c) => a.extend(c), new maplibregl.LngLatBounds(line[0], line[0]));
    const m = new maplibregl.Map({
      container: box.current,
      center: line[0],
      zoom: 5,
      pitch: 30,
      maxPitch: 75,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
            paint: {
              "raster-saturation": -0.35,
              "raster-brightness-max": 0.78,
              "raster-contrast": 0.18,
            },
          },
        ],
      },
    });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");

    const drawRoute = () => {
      if (!map.current || line.length < 2) return;
      m.resize();
      m.fitBounds(b, { padding: 80, maxZoom: 12, duration: 0 });
      if (m.getSource("r")) return;

      const feat = (c: LL[]) => ({
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates: c },
      });
      m.addSource("r", { type: "geojson", data: feat(line) });
      m.addLayer({
        id: "glow",
        type: "line",
        source: "r",
        paint: { "line-color": "#5eead4", "line-width": 12, "line-blur": 8, "line-opacity": 0.65 },
      });
      m.addLayer({
        id: "core",
        type: "line",
        source: "r",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffd37a", "line-width": 4 },
      });

      const n = line.length - 1,
        t0 = performance.now(),
        dur = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 2500;
      const tick = (now: number) => {
        if (!map.current || line.length < 2) return;
        const t = Math.min((now - t0) / dur, 1),
          k = t * n,
          i = Math.min(Math.floor(k), n - 1);
        const pts = line.slice(0, i + 1);
        if (i < n) {
          const a = line[i],
            c = line[i + 1];
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
    };

    m.on("load", drawRoute);
    const resizeTimer = setTimeout(() => {
      if (map.current) {
        map.current.resize();
        map.current.fitBounds(b, { padding: 80, maxZoom: 12, duration: 0 });
      }
    }, 150);

    return () => {
      clearTimeout(resizeTimer);
      cancelAnimationFrame(animRaf.current);
      cancelAnimationFrame(raf.current);
      stopMarkers.current.forEach((mk) => mk.remove());
      stopMarkers.current = [];
      sightMarkers.current.forEach((mk) => mk.remove());
      sightMarkers.current = [];
      m.remove();
      map.current = null;
    };
  }, [line]);

  // 2. Plot ALL train stops on the open-source map
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    stopMarkers.current.forEach((mk) => mk.remove());
    stopMarkers.current = [];

    stops.forEach((st, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "stop-marker";

      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = idx === 0 || idx === stops.length - 1 ? "stop-dot terminal" : "stop-dot";
      dot.title = `${st.name}${st.code ? ` (${st.code})` : ""}`;
      dot.setAttribute("aria-label", st.name);

      const label = document.createElement("span");
      label.className = "stop-label";
      label.textContent = st.code ? `${st.name} (${st.code})` : st.name;

      wrap.appendChild(dot);
      wrap.appendChild(label);

      const metaParts: string[] = [];
      if (st.arrival) metaParts.push(`Arr: ${st.arrival}`);
      if (st.departure) metaParts.push(`Dep: ${st.departure}`);
      if (st.distance !== undefined) metaParts.push(`${st.distance} km`);

      const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
        `<div style="color:#070b14;font-family:system-ui,sans-serif;padding:2px 4px">
          <strong style="font-size:0.9rem">${st.name}${st.code ? ` (${st.code})` : ""}</strong>
          ${metaParts.length ? `<div style="font-size:0.78rem;color:#334155;margin-top:2px">${metaParts.join(" • ")}</div>` : ""}
        </div>`
      );

      wrap.onclick = (e) => {
        e.stopPropagation();
        setActiveStopIdx(idx);
        m.flyTo({ center: st.at, zoom: 10, speed: 1.3 });
      };

      const marker = new maplibregl.Marker({ element: wrap, anchor: "center" })
        .setLngLat(st.at)
        .setPopup(popup)
        .addTo(m);
      stopMarkers.current.push(marker);
    });
  }, [stops, line]);

  // 3. Plot scenic sights on the map (without recreating the map)
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    sightMarkers.current.forEach((mk) => mk.remove());
    sightMarkers.current = [];

    sights.forEach((s, idx) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "pin";
      el.title = s.name;
      el.setAttribute("aria-label", s.name);
      el.onclick = (e) => {
        e.stopPropagation();
        onPick?.(s);
        onSelect?.(idx);
      };
      const marker = new maplibregl.Marker({ element: el }).setLngLat(s.at).addTo(m);
      sightMarkers.current.push(marker);
    });
  }, [sights, line, onPick, onSelect]);

  useEffect(() => {
    if (active !== undefined && active >= 0 && sights[active] && map.current) {
      map.current.flyTo({ center: sights[active].at, zoom: 12, speed: 1.2 });
    }
  }, [active, sights]);

  const ride = () => {
    const m = map.current;
    if (!m || line.length < 2) return;
    if (riding) {
      cancelAnimationFrame(raf.current);
      setRiding(false);
      return;
    }
    setRiding(true);
    const cum = [0];
    line.forEach((p, i) => {
      if (i) cum.push(cum[i - 1] + hav(line[i - 1], p));
    });
    const total = cum[cum.length - 1];
    if (!total || isNaN(total)) {
      setRiding(false);
      return;
    }
    const dur = Math.min(90000, Math.max(25000, total * 60)),
      t0 = performance.now();
    let k = 0;
    const at = (d: number): LL => {
      while (k < cum.length - 2 && cum[k + 1] < d) k++;
      const span = cum[k + 1] - cum[k] || 1;
      const f = (d - cum[k]) / span;
      const p0 = line[k] || line[0];
      const p1 = line[k + 1] || p0;
      return [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f];
    };
    const step = (now: number) => {
      const d = Math.min((now - t0) / dur, 1) * total,
        p = at(d),
        q = at(Math.min(d + Math.max(2, total / 80), total));
      m.jumpTo({ center: p, bearing: (Math.atan2(q[0] - p[0], q[1] - p[1]) * 180) / Math.PI, pitch: 60, zoom: 11 });
      if (d < total) raf.current = requestAnimationFrame(step);
      else setRiding(false);
    };
    raf.current = requestAnimationFrame(step);
  };

  const focusStop = (st: Stop, idx: number) => {
    setActiveStopIdx(idx);
    if (map.current) {
      map.current.flyTo({ center: st.at, zoom: 10, speed: 1.3 });
      stopMarkers.current[idx]?.togglePopup();
    }
  };

  return (
    <>
      <div ref={box} className="map" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {stops.length > 0 && (
        <div className="stops-strip glass" aria-label="Train stops">
          <div className="stops-strip-title">Stops ({stops.length})</div>
          <div className="stops-list">
            {stops.map((st, idx) => (
              <button
                key={`${st.code || st.name}-${idx}`}
                type="button"
                className={activeStopIdx === idx ? "stop-chip active" : "stop-chip"}
                onClick={() => focusStop(st, idx)}
              >
                <span className="stop-num">{idx + 1}</span>
                <span className="stop-name">{st.name}</span>
                {st.code && <small className="stop-code">{st.code}</small>}
              </button>
            ))}
          </div>
        </div>
      )}
      <button className="ride" onClick={ride}>
        {riding ? "Stop" : "Ride the route"}
      </button>
    </>
  );
}


