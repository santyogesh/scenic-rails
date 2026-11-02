"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { track as trackEvent } from "@vercel/analytics";
import "maplibre-gl/dist/maplibre-gl.css";
import { hav, LL } from "@/lib/geo";
import { bearing, locate } from "@/lib/side";
import type { Sight, Stop, LiveTrainStatus } from "@/lib/rail";
import type { Route } from "@/data/routes";
import { headingTransform, TRAIN_MASCOT_SVG } from "./TrainMascot";
import { createTrain3D, MIN_3D_ZOOM, Train3D } from "./Train3DLayer";

/** Camera turned this many degrees off the track so the loco is seen three-quarter on, not end-on. */
const VIEW_ANGLE = 30;

export type RouteMapProps = {
  line?: LL[];
  stops?: Stop[];
  sights?: Sight[];
  onPick?: (s: Sight) => void;
  route?: Route;
  active?: number;
  onSelect?: (index: number) => void;
  liveStatus?: LiveTrainStatus | null;
  trainNumber?: string;
  onRefreshLive?: () => void;
  /** Direction of travel at the live train position, degrees from north. */
  liveBearing?: number;
  /** Called with km travelled during "Ride the route", and null when the ride ends. */
  onRideProgress?: (km: number | null) => void;
  focusAt?: LL | null;
  /** Where the train is (live, else the ride/slider position) and its heading; the map opens here, zoomed in. */
  trainAt?: LL | null;
  heading?: number;
  trainMoving?: boolean;
  /** Index ranges of the line drawn straight because no rail track was matched; shown dashed. */
  approx?: [number, number][];
};

type Lines = { type: "Feature"; properties: {}; geometry: { type: "MultiLineString"; coordinates: LL[][] } };
const multi = (parts: LL[][]): Lines => ({ type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: parts.filter((p) => p.length >= 2) } });

/** Split the line into on-track parts and approximate (dashed) parts. */
function splitRoute(line: LL[], approx: [number, number][] = []): { solid: Lines; dashed: Lines } {
  const solid: LL[][] = [], dashed: LL[][] = [];
  let i = 0;
  for (const [a0, b0] of [...approx].sort((x, y) => x[0] - y[0])) {
    const a = Math.max(0, Math.min(a0, line.length - 1)), b = Math.max(a, Math.min(b0, line.length - 1));
    if (a > i) solid.push(line.slice(i, a + 1));
    dashed.push(line.slice(a, b + 1));
    i = Math.max(i, b);
  }
  if (i < line.length - 1) solid.push(line.slice(i));
  return { solid: multi(solid), dashed: multi(dashed) };
}

export default function RouteMap({
  line: propLine,
  approx,
  stops: propStops,
  sights: propSights,
  onPick,
  route,
  active,
  onSelect,
  liveStatus,
  trainNumber,
  onRefreshLive,
  liveBearing,
  onRideProgress,
  focusAt,
  trainAt,
  heading = 0,
  trainMoving = false,
}: RouteMapProps) {
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
  const liveMarker = useRef<maplibregl.Marker | null>(null);
  const raf = useRef(0);
  const animRaf = useRef(0);
  const ridingRef = useRef(false);
  const liveRef = useRef(liveStatus);
  const bearingRef = useRef(liveBearing);
  liveRef.current = liveStatus;
  bearingRef.current = liveBearing;
  const [riding, setRiding] = useState(false);
  const [activeStopIdx, setActiveStopIdx] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);
  const [stopsOpen, setStopsOpen] = useState(false);
  const train3d = useRef<Train3D | null>(null);
  const pose = useRef({ at: trainAt, heading, moving: trainMoving });
  pose.current = { at: trainAt, heading, moving: trainMoving };
  const routeData = useRef({ line, approx });
  routeData.current = { line, approx };
  const hasLine = line.length >= 2;
  const bounds = useMemo(
    () => (line.length ? line.reduce((a, c) => a.extend(c), new maplibregl.LngLatBounds(line[0], line[0])) : null),
    [line]
  );

  // 1. Initialize OpenStreetMap map & draw rail track
  useEffect(() => {
    if (!box.current || line.length < 2) return;
    const b = bounds!;
    const m = new maplibregl.Map({
      container: box.current,
      center: pose.current.at ?? line[0],
      zoom: 5,
      pitch: 30,
      maxPitch: 75,
      pixelRatio: Math.min(devicePixelRatio, 2),
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
    if (matchMedia("(min-width: 701px)").matches) m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");

    // Open zoomed in on the train, looking along the track; fall back to the whole route.
    const openView = () => {
      const { at, heading: h } = pose.current;
      if (at) m.jumpTo({ center: at, zoom: 14, pitch: 60, bearing: h - VIEW_ANGLE });
      else m.fitBounds(b, { padding: 80, maxZoom: 12, duration: 0 });
    };
    const toggle3d = () => box.current?.classList.toggle("z3d", m.getZoom() >= MIN_3D_ZOOM);
    m.on("zoom", toggle3d);

    const drawRoute = () => {
      const line = routeData.current.line;
      if (!map.current || line.length < 2) return;
      m.resize();
      openView();
      toggle3d();
      if (m.getSource("r")) return;

      const { solid, dashed } = splitRoute(line, routeData.current.approx);
      m.addSource("r", { type: "geojson", data: solid });
      m.addSource("r-approx", { type: "geojson", data: dashed });
      m.addLayer({
        id: "approx",
        type: "line",
        source: "r-approx",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffd37a", "line-width": 3, "line-opacity": 0.45, "line-dasharray": [1.5, 2] },
      });
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

      // Draw-on intro, only for a line that is fully on track.
      if (!routeData.current.approx?.length) {
        const n = line.length - 1,
          t0 = performance.now(),
          dur = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 2500;
        const tick = (now: number) => {
          if (!map.current || routeData.current.line !== line) return;
          const t = Math.max(0, Math.min((now - t0) / dur, 1)),
            k = t * n,
            i = Math.min(Math.floor(k), n - 1);
          const pts = line.slice(0, i + 1);
          if (i < n) {
            const a = line[i],
              c = line[i + 1];
            const f = k - i;
            pts.push([a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f]);
          }
          (m.getSource("r") as maplibregl.GeoJSONSource | undefined)?.setData(multi([pts]));
          if (t < 1) animRaf.current = requestAnimationFrame(tick);
        };
        animRaf.current = requestAnimationFrame(tick);
      }

      createTrain3D()
        .then((t) => {
          if (map.current !== m) return;
          m.addLayer(t.layer);
          train3d.current = t;
          const p = pose.current;
          if (p.at) t.setPose(p.at, p.heading, p.moving);
        })
        .catch(() => {});
    };

    m.on("load", drawRoute);
    const resizeTimer = setTimeout(() => {
      map.current?.resize();
    }, 150);

    return () => {
      clearTimeout(resizeTimer);
      cancelAnimationFrame(animRaf.current);
      cancelAnimationFrame(raf.current);
      ridingRef.current = false;
      setRiding(false);
      stopMarkers.current.forEach((mk) => mk.remove());
      stopMarkers.current = [];
      sightMarkers.current.forEach((mk) => mk.remove());
      sightMarkers.current = [];
      if (liveMarker.current) {
        liveMarker.current.remove();
        liveMarker.current = null;
      }
      train3d.current = null;
      m.remove();
      map.current = null;
    };
    // The map is built once per journey; a refined line is swapped in below without moving the camera.
  }, [hasLine]);

  useEffect(() => {
    const m = map.current;
    const solidSrc = m?.getSource("r") as maplibregl.GeoJSONSource | undefined;
    const dashedSrc = m?.getSource("r-approx") as maplibregl.GeoJSONSource | undefined;
    if (!solidSrc || !dashedSrc || line.length < 2) return;
    cancelAnimationFrame(animRaf.current);
    const { solid, dashed } = splitRoute(line, approx);
    solidSrc.setData(solid);
    dashedSrc.setData(dashed);
  }, [line, approx]);

  useEffect(() => {
    if (ridingRef.current || !trainAt) return;
    train3d.current?.setPose(trainAt, heading, trainMoving);
  }, [trainAt?.[0], trainAt?.[1], heading, trainMoving]);

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
      const isTerm = idx === 0 || idx === stops.length - 1;
      const isDeparted = st.status === "departed";
      const isCurr = st.status === "current";
      dot.className = `stop-dot ${isTerm ? "terminal" : ""} ${isDeparted ? "departed" : ""} ${isCurr ? "current" : ""}`.trim();
      dot.title = `${st.name}${st.code ? ` (${st.code})` : ""}`;
      dot.setAttribute("aria-label", st.name);

      const label = document.createElement("span");
      label.className = `stop-label ${isDeparted ? "departed" : ""}`.trim();
      label.textContent = st.code ? `${st.name} (${st.code})` : st.name;

      wrap.appendChild(dot);
      wrap.appendChild(label);

      const metaParts: string[] = [];
      if (st.status) metaParts.push(st.status.toUpperCase());
      if (st.arrival) metaParts.push(`Arr: ${st.arrival}`);
      if (st.departure) metaParts.push(`Dep: ${st.departure}`);
      if (st.platform) metaParts.push(`Plat: ${st.platform}`);
      if (st.distance !== undefined) metaParts.push(`${st.distance} km`);

      const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
        `<div style="color:#070b14;font-family:system-ui,sans-serif;padding:3px 6px">
          <strong style="font-size:0.92rem;display:block">${st.name}${st.code ? ` (${st.code})` : ""}</strong>
          ${metaParts.length ? `<div style="font-size:0.78rem;color:#334155;margin-top:3px">${metaParts.join(" • ")}</div>` : ""}
        </div>`
      );

      wrap.onclick = (e) => {
        e.stopPropagation();
        setActiveStopIdx(idx);
        m.flyTo({ center: st.at, zoom: 10, speed: 1.3 });
      };

      // Anchor on the dot (not the dot + label box) so the station sits exactly on the track.
      const marker = new maplibregl.Marker({ element: wrap, anchor: "left", offset: [isTerm ? -9 : -7, 0] })
        .setLngLat(st.at)
        .setPopup(popup)
        .addTo(m);
      stopMarkers.current.push(marker);
    });
  }, [stops, line]);

  // 3. Visualise LIVE RUNNING TRAIN on the map
  useEffect(() => {
    const m = map.current;
    if (!m || ridingRef.current) return;

    if (!liveStatus?.currentLocation?.at) {
      if (liveMarker.current) {
        liveMarker.current.remove();
        liveMarker.current = null;
      }
      return;
    }

    const trainCoords = liveStatus.currentLocation.at;

    if (!liveMarker.current) {
      const wrap = document.createElement("div");
      wrap.className = "live-train-marker";
      wrap.setAttribute("title", `Live Train ${liveStatus.trainNumber}`);

      const radar = document.createElement("div");
      radar.className = "live-radar-pulse";

      const heading = document.createElement("div");
      heading.className = "live-heading";
      heading.innerHTML = "<i></i>";

      const badge = document.createElement("div");
      badge.className = "live-loco";
      badge.innerHTML = TRAIN_MASCOT_SVG;

      const tag = document.createElement("div");
      tag.className = "live-train-tag";
      const isLate = (liveStatus.delayMinutes || 0) > 0;
      tag.innerHTML = `<span>${liveStatus.trainNumber}</span><strong class="${liveStatus.estimated ? "est" : isLate ? "late" : "ontime"}">${liveStatus.estimated ? "TIMETABLE" : isLate ? `+${liveStatus.delayMinutes}m` : "ON TIME"}</strong>`;

      wrap.appendChild(radar);
      wrap.appendChild(heading);
      wrap.appendChild(badge);
      wrap.appendChild(tag);

      const delayColor = liveStatus.estimated ? "#64748b" : isLate ? "#f59e0b" : "#10b981";
      const popup = new maplibregl.Popup({ offset: 20, closeButton: true }).setHTML(`
        <div class="live-popup-card">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px">
            <strong style="color:#0f172a;font-size:0.95rem">🚆 Train ${liveStatus.trainNumber}</strong>
            <span style="font-size:0.75rem;font-weight:700;color:${delayColor};background:${delayColor}15;padding:2px 6px;border-radius:4px">${liveStatus.estimated ? "Timetable estimate" : isLate ? `+${liveStatus.delayMinutes} min delay` : "On Time"}</span>
          </div>
          <div style="font-size:0.82rem;color:#334155;margin-bottom:4px">
            <strong>Location:</strong> ${liveStatus.currentLocation.stationName || "In transit"}
          </div>
          ${liveStatus.nextHalt ? `<div style="font-size:0.82rem;color:#334155;margin-bottom:4px"><strong>Next stop:</strong> ${liveStatus.nextHalt.stationName} ${liveStatus.nextHalt.scheduledArrival ? `(Arr ${liveStatus.nextHalt.scheduledArrival})` : ""}</div>` : ""}
          ${liveStatus.currentLocation.speedKmh && !liveStatus.estimated ? `<div style="font-size:0.82rem;color:#334155;margin-bottom:4px"><strong>Live Speed:</strong> ~${liveStatus.currentLocation.speedKmh} km/h</div>` : ""}
          ${liveStatus.currentLocation.distanceFromOriginKm !== undefined ? `<div style="font-size:0.82rem;color:#64748b">Distance: ${liveStatus.currentLocation.distanceFromOriginKm} km covered</div>` : ""}
          <div style="font-size:0.7rem;color:#94a3b8;margin-top:6px">Updated: ${new Date(liveStatus.lastUpdatedAt).toLocaleTimeString()}</div>
        </div>
      `);

      wrap.onclick = () => {
        m.flyTo({ center: trainCoords, zoom: 11, speed: 1.2 });
      };

      liveMarker.current = new maplibregl.Marker({ element: wrap, anchor: "center" })
        .setLngLat(trainCoords)
        .setPopup(popup)
        .addTo(m);
    } else {
      liveMarker.current.setLngLat(trainCoords);
      const tag = liveMarker.current.getElement().querySelector(".live-train-tag");
      if (tag) {
        const isLate = (liveStatus.delayMinutes || 0) > 0;
        tag.innerHTML = `<span>${liveStatus.trainNumber}</span><strong class="${liveStatus.estimated ? "est" : isLate ? "late" : "ontime"}">${liveStatus.estimated ? "TIMETABLE" : isLate ? `+${liveStatus.delayMinutes}m` : "ON TIME"}</strong>`;
      }
    }
    liveMarker.current
      .getElement()
      .classList.toggle("moving", liveStatus.status === "running" && (liveStatus.currentLocation.speedKmh ?? 0) > 0);
  }, [liveStatus]);

  // Keep the heading arrow pointing along the track, even when the map is rotated.
  useEffect(() => {
    const m = map.current;
    if (!m || liveBearing === undefined) return;
    const orient = () => {
      if (ridingRef.current) return;
      const arrow = liveMarker.current?.getElement().querySelector<HTMLElement>(".live-heading");
      if (arrow) {
        arrow.style.transform = headingTransform(liveBearing, m.getBearing());
        arrow.style.opacity = "1";
      }
    };
    orient();
    m.on("rotate", orient);
    return () => {
      m.off("rotate", orient);
    };
  }, [liveBearing, liveStatus]);

  useEffect(() => {
    if (focusAt && map.current) map.current.flyTo({ center: focusAt, zoom: 12, speed: 1.3 });
  }, [focusAt]);

  // 4. Plot scenic sights on the map
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    sightMarkers.current.forEach((mk) => mk.remove());
    sightMarkers.current = [];

    sights.forEach((s, idx) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "side" in s ? `pin ${(s as { crossing?: boolean }).crossing ? "crossing" : s.side}` : "pin";
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

  const focusLiveTrain = () => {
    const at = trainAt ?? liveStatus?.currentLocation?.at;
    if (map.current && at) map.current.flyTo({ center: at, zoom: 14, pitch: 60, bearing: heading - VIEW_ANGLE, speed: 1.4 });
  };

  const wholeRoute = () => {
    const m = map.current;
    if (!m || !bounds) return;
    m.jumpTo({ pitch: 0, bearing: 0 });
    m.fitBounds(bounds, { padding: 60, maxZoom: 12 });
  };

  const handleRefresh = async () => {
    if (onRefreshLive) {
      setIsRefreshing(true);
      try {
        await onRefreshLive();
      } finally {
        setTimeout(() => setIsRefreshing(false), 600);
      }
    }
  };

  const placeTrain = (p: LL, h: number, moving: boolean) => {
    const mapNow = map.current;
    if (!mapNow) return;
    train3d.current?.setPose(p, h, moving, 0);
    let marker = liveMarker.current;
    if (!marker) {
      const wrap = document.createElement("div");
      wrap.className = "live-train-marker";
      const arrowEl = document.createElement("div");
      arrowEl.className = "live-heading";
      arrowEl.innerHTML = "<i></i>";
      const badge = document.createElement("div");
      badge.className = "live-loco";
      badge.innerHTML = TRAIN_MASCOT_SVG;
      wrap.append(arrowEl, badge);
      marker = new maplibregl.Marker({ element: wrap, anchor: "center" }).setLngLat(p).addTo(mapNow);
      liveMarker.current = marker;
    } else {
      marker.setLngLat(p);
    }
    const el = marker.getElement();
    el.classList.toggle("moving", moving);
    const arrow = el.querySelector<HTMLElement>(".live-heading");
    if (arrow) {
      arrow.style.transition = moving ? "none" : "";
      arrow.style.transform = headingTransform(h, mapNow.getBearing());
      arrow.style.opacity = "1";
    }
  };

  const stopRide = () => {
    cancelAnimationFrame(raf.current);
    ridingRef.current = false;
    setRiding(false);
    onRideProgress?.(null);
    const at = liveRef.current?.currentLocation?.at;
    if (!at) {
      liveMarker.current?.getElement().classList.remove("moving");
      return;
    }
    const status = liveRef.current;
    const h = bearingRef.current ?? heading;
    placeTrain(at, h, status?.status === "running" && (status.currentLocation?.speedKmh ?? 0) > 0);
  };

  const ride = () => {
    const m = map.current;
    if (!m || line.length < 2) return;
    if (ridingRef.current) {
      stopRide();
      return;
    }
    const cum = [0];
    line.forEach((p, i) => {
      if (i) cum.push(cum[i - 1] + hav(line[i - 1], p));
    });
    const total = cum[cum.length - 1];
    if (!total || isNaN(total)) return;

    let startKm = 0;
    let restarted = false;
    const origin = pose.current.at;
    if (origin) {
      const loc = locate({ line, cum, total }, origin);
      if (loc && loc.offsetKm < 30) {
        if (loc.km < total * 0.98) startKm = loc.km;
        else restarted = true;
      }
    }
    const span = total - startKm;
    const fullDur = Math.min(90000, Math.max(25000, total * 60));
    const dur = Math.max(4000, fullDur * (span / total));

    const sample = (d: number, from: number) => {
      let i = from;
      const dist = Math.max(0, Math.min(d, total));
      while (i < cum.length - 2 && cum[i + 1] < dist) i++;
      const a = line[i],
        b = line[i + 1] ?? a;
      const f = Math.max(0, Math.min(1, (dist - cum[i]) / ((cum[i + 1] - cum[i]) || 1)));
      return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f] as LL, i };
    };

    const first = sample(startKm, 0);
    const look0 = sample(Math.min(startKm + Math.max(2, total / 80), total), first.i);
    let cursor = first.i;
    let head = bearing(first.p, look0.p);
    // Keep the current framing. The camera then translates by exactly the train's movement.
    const originCenter = m.getCenter();
    const offLng = restarted ? 0 : originCenter.lng - first.p[0];
    const offLat = restarted ? 0 : originCenter.lat - first.p[1];
    let lastReport = 0;
    let lastNow = performance.now();
    const t0 = lastNow;

    ridingRef.current = true;
    setRiding(true);
    trackEvent("ride_start");
    m.stop();

    const step = (now: number) => {
      const mapNow = map.current;
      if (!ridingRef.current || !mapNow) return;
      const u = Math.min((now - t0) / dur, 1);
      const d = startKm + u * span;
      const here = sample(d, cursor);
      cursor = here.i;
      const aheadKm = Math.min(d + Math.max(2, total / 80), total);
      const look = sample(aheadKm, cursor);
      const target = aheadKm - d < 0.05 ? head : bearing(here.p, look.p);
      const dt = Math.min(50, now - lastNow);
      lastNow = now;
      head += ((((target - head) % 360) + 540) % 360 - 180) * (1 - Math.exp(-dt / 280));
      const h = (head + 360) % 360;
      placeTrain(here.p, h, true);
      // Pan only, at the train's speed. Bearing, pitch, and zoom stay so the map does not spin.
      mapNow.jumpTo({ center: [here.p[0] + offLng, here.p[1] + offLat] });
      if (now - lastReport > 250) {
        lastReport = now;
        onRideProgress?.(d);
      }
      if (u < 1) raf.current = requestAnimationFrame(step);
      else stopRide();
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

  const isLate = (liveStatus?.delayMinutes || 0) > 0;
  const est = Boolean(liveStatus?.estimated);
  const delayLabel = est ? "Timetable" : isLate ? `+${liveStatus?.delayMinutes}m` : "On time";

  return (
    <>
      <div ref={box} className="map" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Live Train Running HUD Overlay */}
      {liveStatus && (
        <div className={`live-hud glass ${hudOpen ? "" : "closed"}`} aria-label="Live Train Running Status">
          <div className="live-hud-top">
            <button type="button" className="live-pulse-badge" onClick={() => setHudOpen((o) => !o)} aria-expanded={hudOpen}>
              <span className="live-dot" />
              <span>{hudOpen ? (est ? "SCHEDULED POSITION" : "LIVE STATUS") : `${liveStatus.trainNumber} · ${delayLabel}`}</span>
              <span className="chev">{hudOpen ? "▾" : "▸"}</span>
            </button>
            <div className="live-hud-actions">
              <button
                type="button"
                className="live-action-btn"
                title="Locate live train on map"
                onClick={focusLiveTrain}
              >
                📍 Locate
              </button>
              {onRefreshLive && (
                <button
                  type="button"
                  className={isRefreshing ? "live-action-btn spinning" : "live-action-btn"}
                  title="Get the train's reported position"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  🔄
                </button>
              )}
            </div>
          </div>

          {hudOpen && (
          <div className="live-hud-main">
            <div className="live-status-row">
              <span className="live-train-no">🚆 {liveStatus.trainNumber}</span>
              <span className={`live-delay-pill ${est ? "est" : isLate ? "late" : "ontime"}`}>
                {est ? "Timetable estimate" : isLate ? `+${liveStatus.delayMinutes}m Late` : "On Time"}
              </span>
            </div>
            {est && (
              <div className="live-est-note">Worked out from the timetable, so delays aren&apos;t shown. Tap 🔄 for the train&apos;s reported position.</div>
            )}

            <div className="live-location-desc">
              <strong>Location:</strong> {liveStatus.currentLocation?.stationName || "In transit"}
            </div>

            {liveStatus.nextHalt && (
              <div className="live-next-halt">
                <span className="arrow">➔</span>
                <span>
                  Next: <strong>{liveStatus.nextHalt.stationName}</strong>
                  {liveStatus.nextHalt.scheduledArrival ? ` (${liveStatus.nextHalt.scheduledArrival})` : ""}
                  {liveStatus.nextHalt.platform ? ` • Plat ${liveStatus.nextHalt.platform}` : ""}
                </span>
              </div>
            )}

            {liveStatus.currentLocation?.distanceFromOriginKm !== undefined && (
              <div className="live-progress-wrap">
                <div className="live-progress-bar">
                  <div
                    className="live-progress-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          5,
                          ((liveStatus.currentLocation.distanceFromOriginKm || 0) /
                            (liveStatus.totalDistance || 1388)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <div className="live-progress-label">
                  <span>{liveStatus.currentLocation.distanceFromOriginKm} km covered</span>
                  <span>{liveStatus.totalDistance ? `${liveStatus.totalDistance} km total` : ""}</span>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {stops.length > 0 && (
        <div className={`stops-strip glass ${stopsOpen ? "" : "closed"}`} aria-label="Train stops">
          <button type="button" className="stops-strip-title" onClick={() => setStopsOpen((o) => !o)} aria-expanded={stopsOpen}>
            <span>Stops ({stops.length})</span>
            <span className="chev">{stopsOpen ? "▾" : "▸"}</span>
          </button>
          {stopsOpen && (
          <div className="stops-list">
            {stops.map((st, idx) => (
              <button
                key={`${st.code || st.name}-${idx}`}
                type="button"
                className={`stop-chip ${activeStopIdx === idx ? "active" : ""} ${
                  st.status === "departed" ? "departed" : ""
                } ${st.code === liveStatus?.nextHalt?.stationCode ? "next-halt-chip" : ""}`.trim()}
                onClick={() => focusStop(st, idx)}
              >
                <span className="stop-num">{st.status === "departed" ? "✓" : idx + 1}</span>
                <span className="stop-name">{st.name}</span>
                {st.code && <small className="stop-code">{st.code}</small>}
              </button>
            ))}
          </div>
          )}
        </div>
      )}

      <div className="map-fabs">
        <button type="button" className="fab" onClick={focusLiveTrain} aria-label="Go to the train" title="Go to the train">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
        </button>
        <button type="button" className="fab" onClick={wholeRoute} aria-label="Show whole route" title="Whole route">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" className={`fab ${riding ? "on" : ""}`} onClick={ride} aria-label={riding ? "Stop the ride" : "Ride the route"} title={riding ? "Stop" : "Ride the route"}>
          {riding ? (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor" /></svg>
          )}
        </button>
      </div>
    </>
  );
}


