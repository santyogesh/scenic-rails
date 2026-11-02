"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { track as trackEvent } from "@vercel/analytics";
import { hav } from "@/lib/geo";
import { bearing, compass } from "@/lib/side";
import { NearbyItem, useNearby } from "@/lib/nearby";
import { requestOrientationPermission, useGps, useHeading } from "@/lib/useGeo";
import { KIND_LABEL } from "@/lib/window";
import { wikiSummary } from "@/lib/wikiWindow";

// Rough horizontal/vertical field of view of a phone's main camera once the video is cropped to fill the screen.
const FOV_PORTRAIT = { h: 42, v: 66 };
const FOV_LANDSCAPE = { h: 62, v: 40 };
const PIN_W = 160;
const ROW_H = 58;
const MAX_ROWS = 6;
const MAX_PINS = 24;
/** Space kept free at the top for the compass strip and status chips. */
const TOP_CLEAR = 130;

type Placed = { it: NearbyItem; dist: number; brg: number; x: number; y: number; near: number };

const fmtDist = (km: number) => (km < 1 ? `${Math.round(km * 100) * 10} m` : km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`);
const wrap = (d: number) => ((((d % 360) + 540) % 360) - 180);

export default function CameraView() {
  const [started, setStarted] = useState(false);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [orientDenied, setOrientDenied] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [sel, setSel] = useState<NearbyItem | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  const gps = useGps(started);
  const { heading, pitch, uncertain, missing } = useHeading(started && !orientDenied);
  const { items, loading } = useNearby(gps.at);

  useEffect(() => {
    const m = () => setSize({ w: innerWidth, h: innerHeight });
    m();
    addEventListener("resize", m);
    return () => removeEventListener("resize", m);
  }, []);

  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  useEffect(() => {
    setSummary(null);
    if (!sel || sel.source !== "wikipedia" || sel.text.length > 160) return;
    let ok = true;
    wikiSummary(Number(sel.id.slice(5))).then((t) => ok && setSummary(t));
    return () => { ok = false; };
  }, [sel]);

  // Both prompts must start inside the tap: iOS refuses compass and camera access otherwise.
  async function start() {
    const orient = requestOrientationPermission();
    const cam = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      : Promise.reject(new Error("unsupported"));
    setStarted(true);
    setOrientDenied(!(await orient));
    try {
      const s = await cam;
      stream.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play().catch(() => {});
      }
      setCamErr(null);
    } catch (e) {
      setCamErr(e instanceof DOMException && e.name === "NotAllowedError" ? "Camera permission was denied." : "Camera unavailable.");
    }
    trackEvent("look_around");
  }

  const portrait = size.h >= size.w;
  const fov = portrait ? FOV_PORTRAIT : FOV_LANDSCAPE;

  const rel = useMemo(() => {
    if (!gps.at || !items) return [];
    return items.map((it) => {
      const brg = bearing(gps.at!, it.at);
      return { it, dist: hav(gps.at!, it.at), brg };
    });
  }, [items, gps.at?.[0], gps.at?.[1]]);

  const view = useMemo(() => {
    const placed: Placed[] = [];
    const left: typeof rel = [], right: typeof rel = [];
    if (heading === null || !size.w) return { placed, left, right };
    // Pointing the camera up moves the horizon down the screen.
    const horizon = Math.min(size.h - 40, Math.max(TOP_CLEAR + ROW_H, size.h / 2 + (pitch / fov.v) * size.h));
    const maxRows = Math.max(1, Math.min(MAX_ROWS, Math.floor((horizon - 30 - TOP_CLEAR) / ROW_H)));
    const rows: number[][] = [];
    const sorted = [...rel].sort((a, b) => a.dist - b.dist);
    const maxDist = Math.max(1, ...sorted.map((r) => r.dist));
    for (const r of sorted) {
      const d = wrap(r.brg - heading);
      if (d < -fov.h / 2) { left.push(r); continue; }
      if (d > fov.h / 2) { right.push(r); continue; }
      if (placed.length >= MAX_PINS) continue;
      const x = Math.min(size.w - PIN_W / 2 - 4, Math.max(PIN_W / 2 + 4, size.w / 2 + (d / (fov.h / 2)) * (size.w / 2)));
      let row = 0;
      while (row < maxRows && (rows[row] ?? []).some((ox) => Math.abs(ox - x) < PIN_W)) row++;
      if (row >= maxRows) continue;
      (rows[row] ??= []).push(x);
      placed.push({ ...r, x, y: horizon - 30 - row * ROW_H, near: 1 - r.dist / maxDist });
    }
    const byGap = (a: { brg: number }, b: { brg: number }) => Math.abs(wrap(a.brg - heading)) - Math.abs(wrap(b.brg - heading));
    return { placed, left: left.sort(byGap), right: right.sort(byGap) };
  }, [rel, heading, pitch, size.w, size.h, fov.h, fov.v]);

  // Compass tick marks every 15 degrees across the visible field of view.
  const ticks = useMemo(() => {
    if (heading === null) return [];
    const out: { deg: number; x: number; label?: string }[] = [];
    const from = Math.ceil((heading - fov.h / 2) / 15) * 15;
    for (let a = from; a <= heading + fov.h / 2; a += 15) {
      const deg = ((a % 360) + 360) % 360;
      out.push({ deg, x: 50 + (wrap(deg - heading) / (fov.h / 2)) * 50, label: deg % 45 === 0 ? compass(deg) : undefined });
    }
    return out;
  }, [heading, fov.h]);

  const close = () => (history.length > 1 ? history.back() : location.assign("/"));

  return (
    <main className={`look ${camErr ? "no-cam" : ""}`}>
      <video ref={video} className="look-video" playsInline muted autoPlay />

      {!started ? (
        <div className="look-gate">
          <div className="look-gate-card glass">
            <h2>Look around</h2>
            <p>Point your phone at the view and see the names of hills, rivers, forts, temples and towns in that direction, with how far away they are.</p>
            <p className="look-fine">Uses your camera, GPS and compass. Nothing is recorded or uploaded.</p>
            <button type="button" className="look-start" onClick={start}>Tap to start</button>
            <button type="button" className="look-link" onClick={close}>Back</button>
          </div>
        </div>
      ) : (
        <>
          <header className="look-top">
            <button type="button" className="look-x glass" onClick={close} aria-label="Close camera">×</button>
            <div className="look-tape glass" aria-label="Compass">
              {ticks.map((t) => (
                <span key={t.deg} className={`look-tick ${t.label ? "major" : ""}`} style={{ left: `${t.x}%` }}>{t.label ?? ""}</span>
              ))}
              <strong className="look-heading">{heading === null ? "--" : `${compass(heading)} ${Math.round(heading)}°`}</strong>
            </div>
          </header>

          <div className="look-chips" role="status">
            {gps.error && <span className="look-chip warn">{gps.error}</span>}
            {!gps.at && !gps.error && <span className="look-chip"><i className="spin" /> Finding your location…</span>}
            {gps.accuracy !== null && gps.accuracy > 100 && <span className="look-chip warn">GPS accuracy about {Math.round(gps.accuracy)} m</span>}
            {loading && <span className="look-chip"><i className="spin" /> Searching nearby…</span>}
            {uncertain && <span className="look-chip warn">Calibrate compass: move your phone in a figure 8</span>}
            {orientDenied && <span className="look-chip warn">Compass permission was denied. Reload and allow motion access.</span>}
            {!orientDenied && missing && <span className="look-chip warn">No compass reading from this device, so landmarks can't be placed.</span>}
            {camErr && <span className="look-chip warn">{camErr} Showing directions only.</span>}
            {items && !loading && !items.length && <span className="look-chip">No named landmarks within 10 km.</span>}
          </div>

          {view.placed.map((p) => (
            <button
              key={p.it.id}
              type="button"
              className="look-pin"
              style={{ left: p.x, top: p.y, ["--s" as any]: 0.85 + 0.25 * p.near }}
              onClick={() => setSel(p.it)}
            >
              <span className="look-pin-body glass">
                <small>{KIND_LABEL[p.it.kind]}</small>
                <strong>{p.it.name}</strong>
                <em>{fmtDist(p.dist)} {compass(p.brg)}</em>
              </span>
              <span className="look-stem" />
            </button>
          ))}

          {view.left.length > 0 && (
            <button type="button" className="look-edge left glass" onClick={() => setSel(view.left[0].it)}>
              <span aria-hidden="true">‹</span>
              <small>{view.left[0].it.name}{view.left.length > 1 ? ` +${view.left.length - 1}` : ""}</small>
            </button>
          )}
          {view.right.length > 0 && (
            <button type="button" className="look-edge right glass" onClick={() => setSel(view.right[0].it)}>
              <small>{view.right[0].it.name}{view.right.length > 1 ? ` +${view.right.length - 1}` : ""}</small>
              <span aria-hidden="true">›</span>
            </button>
          )}

          {sel && gps.at && (
            <div className="look-card glass" role="dialog" aria-label={sel.name}>
              <button type="button" className="x" onClick={() => setSel(null)} aria-label="Close">×</button>
              {sel.img && <img src={sel.img} alt="" />}
              <div>
                <small className="win-kind">{KIND_LABEL[sel.kind]}</small>
                <h3>{sel.name}</h3>
                <p className="look-where">{fmtDist(hav(gps.at, sel.at))} away, towards {compass(bearing(gps.at, sel.at))} ({Math.round(bearing(gps.at, sel.at))}°)</p>
                <p>{summary ?? sel.text}</p>
                {sel.url && <a href={sel.url} target="_blank" rel="noreferrer">{sel.source === "wikipedia" ? "Read on Wikipedia" : "View on OpenStreetMap"}</a>}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
