"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { track as trackEvent } from "@vercel/analytics";
import { geocodeStop, traceRail, photos, pool, Stop, Sight, LiveTrainStatus } from "@/lib/rail";
import { coarse } from "@/lib/railTrack";
import { hav } from "@/lib/geo";
import type { LL } from "@/lib/geo";
import { locate, makeTrack, orientLine, pointAt } from "@/lib/side";
import { mergeItems, sideText, WindowItem } from "@/lib/window";
import { wikiSummary, wikiWindow } from "@/lib/wikiWindow";
import WindowPanel from "@/components/WindowPanel";
import PlaceToast from "@/components/PlaceToast";
import SideSheet, { sheetRows } from "@/components/SideSheet";
import type { Side } from "@/lib/side";
const Globe = dynamic(() => import("@/components/Globe"), { ssr: false });
const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

type Result = {
  line: LL[];
  /** Index ranges of `line` drawn straight because no rail track was matched. */
  approx?: [number, number][];
  stops: Stop[];
  window: WindowItem[] | null;
  title: string;
  liveStatus?: LiveTrainStatus | null;
  trainNumber?: string;
  startDate?: string;
};

const QUICK_TRAINS = [
  { no: "12951", label: "Mumbai → Delhi Rajdhani" },
  { no: "12952", label: "Delhi → Mumbai Rajdhani" },
  { no: "12301", label: "Howrah → Delhi Rajdhani" },
  { no: "12002", label: "Delhi → Bhopal Shatabdi" },
  { no: "20901", label: "Mumbai → Gandhinagar Vande Bharat" },
];
const LAST_KEY = "scenic:last";
const LAST_MAX_AGE_MS = 12 * 3600000;

/** Today and the 4 previous days in IST, as journey start dates. */
function startDates(): { value: string; label: string }[] {
  const ist = Date.now() + 5.5 * 3600000;
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(ist - i * 86400000);
    const value = d.toISOString().slice(0, 10);
    const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    return { value, label };
  });
}

export default function Home() {
  const [q, setQ] = useState(""), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null), [sel, setSel] = useState<Sight | WindowItem | null>(null), [pics, setPics] = useState<string[] | null>(null);
  const [winLoading, setWinLoading] = useState(false), [rideKm, setRideKm] = useState<number | null>(null), [manualKm, setManualKm] = useState(0);
  const [focusAt, setFocusAt] = useState<LL | null>(null), [summary, setSummary] = useState<string | null>(null);
  const winReq = useRef(0), railReq = useRef(0);
  const [tracing, setTracing] = useState(false);
  const [sheet, setSheet] = useState<Side | null>(null);
  const [keepAwake, setKeepAwake] = useState(true), [liveOkAt, setLiveOkAt] = useState(0), [liveFailing, setLiveFailing] = useState(false);
  const [, setTick] = useState(0);

  // Bring back the last journey after a reload or a dropped connection.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null");
      if (saved?.res?.line?.length >= 2 && Date.now() - saved.at < LAST_MAX_AGE_MS) {
        setRes(saved.res);
        setLiveOkAt(saved.at);
        if (saved.res.approx?.length && saved.res.stops?.length >= 2) refineTrack(saved.res.stops.map((s: Stop) => s.at), saved.res.line, !saved.res.window?.length);
        else if (!saved.res.window?.length) loadWindow(saved.res.line);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!res) return;
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify({ res, at: Date.now() }));
    } catch {}
  }, [res]);

  // Keep the screen on while following a live train.
  useEffect(() => {
    if (!keepAwake || !res?.liveStatus || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const acquire = () => {
      if (document.visibilityState === "visible") navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, [keepAwake, Boolean(res?.liveStatus)]);

  useEffect(() => {
    if (!liveFailing) return;
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, [liveFailing]);
  const [dates, setDates] = useState<{ value: string; label: string }[]>([]), [startDate, setStartDate] = useState("");

  // Built on the client so "Today" is the visitor's current IST date, not the build date.
  useEffect(() => {
    const d = startDates();
    setDates(d);
    setStartDate(d[0].value);
  }, []);

  useEffect(() => {
    setSummary(null);
    if (!sel || !("source" in sel) || sel.source !== "wikipedia" || sel.text.length > 160) return;
    let ok = true;
    wikiSummary(Number(sel.id.slice(5))).then((t) => ok && setSummary(t));
    return () => { ok = false; };
  }, [sel]);

  const track = useMemo(() => (res ? makeTrack(res.line) : null), [res?.line]);
  const liveAt = res?.liveStatus?.currentLocation?.at;
  const liveLoc = useMemo(() => (track && liveAt ? locate(track, liveAt) : null), [track, liveAt?.[0], liveAt?.[1]]);
  const liveKm = liveLoc && liveLoc.offsetKm < 20 ? liveLoc.km : null;
  const reportedBearing = res?.liveStatus?.currentLocation?.bearing;
  const liveBearing = track && liveKm !== null ? reportedBearing ?? pointAt(track, liveKm).bearing : undefined;
  const refSource = rideKm !== null ? "ride" : liveKm !== null ? "live" : "manual";
  const refKm = rideKm ?? liveKm ?? manualKm;
  // The train's actual coordinates and running direction; left/right in the Now view is decided from these.
  const refPoint = track ? pointAt(track, refKm) : null;
  const trainAt: LL | null = refSource === "live" && liveAt ? liveAt : refPoint?.at ?? null;
  const heading = refSource === "live" && liveBearing !== undefined ? liveBearing : refPoint?.bearing ?? 0;
  // The toast follows the live train; otherwise it describes where the journey starts.
  const toastAt: LL | null = refSource === "live" && liveAt ? liveAt : res?.line[0] ?? null;
  const nowCounts = useMemo(() => {
    const c = { left: 0, right: 0 };
    for (const x of sheetRows(res?.window ?? null, refKm, trainAt, heading)) if (x.now && !x.it.crossing) c[x.side]++;
    return c;
  }, [res?.window, refKm, trainAt?.[0], trainAt?.[1], heading]);
  const approxKm = useMemo(() => {
    let km = 0;
    for (const [a, b] of res?.approx ?? []) for (let i = a + 1; i <= b && i < (res?.line.length ?? 0); i++) km += hav(res!.line[i - 1], res!.line[i]);
    return Math.round(km);
  }, [res?.line, res?.approx]);
  const trainMoving =
    refSource === "ride" ||
    (refSource === "live" && res?.liveStatus?.status === "running" && (res.liveStatus.currentLocation?.speedKmh ?? 0) > 0);

  // Swap the coarse line for one traced on real track, then find landmarks along whichever line we ended up with.
  async function refineTrack(points: LL[], coarseLine: LL[], withWindow = true) {
    const id = ++railReq.current;
    setTracing(true);
    const r = await traceRail(points);
    if (id !== railReq.current) return;
    setTracing(false);
    if (r) {
      const line = orientLine(r.line, points[0], points[points.length - 1]);
      const flipped = line !== r.line;
      const n = line.length - 1;
      const approx = flipped ? r.approx.map(([a, b]) => [n - b, n - a] as [number, number]) : r.approx;
      setRes((prev) => (prev ? { ...prev, line, approx } : prev));
      if (withWindow) loadWindow(line);
    } else if (withWindow) {
      loadWindow(coarseLine);
    }
  }

  // Landmarks within 5 km either side. Wikipedia is queried from the browser: Wikimedia rate-limits per client,
  // so shared server IPs run out quickly. OSM is its own server request since public Overpass servers can be slow.
  function loadWindow(line: LL[]) {
    const id = ++winReq.current;
    setWinLoading(true);
    const server = (sources: string[]) =>
      fetch("/api/window", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ line, sources }) })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((j) => (j.items ?? []) as WindowItem[]);
    const jobs = [wikiWindow(makeTrack(line), Date.now() + 40000), server(["bharatlas"]), server(["osm"])];
    let pending = jobs.length;
    for (const job of jobs) {
      job
        .then((items) => {
          if (id !== winReq.current) return;
          setRes((prev) => (prev ? { ...prev, window: mergeItems(prev.window ?? [], items) } : prev));
        })
        .catch(() => {})
        .finally(() => {
          if (--pending === 0 && id === winReq.current) {
            setWinLoading(false);
            setRes((prev) => (prev && !prev.window ? { ...prev, window: [] } : prev));
          }
        });
    }
  }

  const pickWindow = (it: WindowItem) => {
    setSel(it);
    setFocusAt(it.at);
  };

  useEffect(() => {
    if (!sel) { setPics(null); return; }
    let ok = true; photos(sel).then((p) => ok && setPics(p));
    const k = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    addEventListener("keydown", k);
    return () => { ok = false; removeEventListener("keydown", k); };
  }, [sel]);

  const refreshLiveStatus = async () => {
    if (!res?.trainNumber) return;
    try {
      const date = res.startDate ? `&date=${res.startDate}` : "";
      const r = await fetch(`/api/train?no=${encodeURIComponent(res.trainNumber)}&liveOnly=1${date}`);
      if (r.ok) {
        const j = await r.json();
        if (j.liveStatus) {
          setRes((prev) => (prev ? { ...prev, liveStatus: j.liveStatus } : prev));
          setLiveOkAt(Date.now());
          setLiveFailing(false);
          return;
        }
      }
    } catch {}
    setLiveFailing(true);
  };

  // Periodic live refresh every 25s when tracking a live train
  useEffect(() => {
    if (!res?.trainNumber || !res.liveStatus?.isLive) return;
    const timer = setInterval(() => {
      refreshLiveStatus();
    }, 25000);
    return () => clearInterval(timer);
  }, [res?.trainNumber, res?.liveStatus?.isLive]);

  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("Starting…");
    try {
      const t = q.trim();
      let line: LL[] = [];
      let stops: Stop[] = [];
      let title = "";
      let waypoints: LL[] = [];
      let liveStatus: LiveTrainStatus | null = null;
      let trainNumber: string | undefined = undefined;

      if (/^\d{4,6}$/.test(t)) {
        trainNumber = t;
        setMsg("Looking up train " + t + " on RailRadar…");
        const r = await fetch(`/api/train?no=${t}${startDate ? `&date=${startDate}` : ""}`, { signal: AbortSignal.timeout(20000) }), j = await r.json();
        if (!r.ok) throw new Error(j.error);
        liveStatus = j.liveStatus || null;
        if (Array.isArray(j.stationStops) && j.stationStops.length >= 2) {
          stops = j.stationStops;
        }
        if (Array.isArray(j.line) && j.line.length >= 2) {
          line = j.line;
          waypoints = Array.isArray(j.waypoints) && j.waypoints.length >= 2 ? j.waypoints : stops.map((s) => s.at);
          title = j.title || `${j.stops[0]} to ${j.stops[j.stops.length - 1]}`;
        } else {
          const list: string[] = j.stops;
          const found = await pool(list, 4, geocodeStop);
          stops = found.filter((s): s is Stop => Boolean(s));
          if (stops.length < 2) throw new Error("Could not locate those stations.");
          line = waypoints = stops.map((s) => s.at);
          title = `${stops[0].name} to ${stops[stops.length - 1].name}`;
        }
      } else {
        const list = t.split(",").map((s) => s.trim()).filter(Boolean);
        if (list.length < 2) throw new Error("Enter a train number, or at least two stations separated by commas.");
        setMsg("Locating stations on RailRadar…");
        const found = await pool(list, 4, geocodeStop);
        stops = found.filter((s): s is Stop => Boolean(s));
        if (stops.length < 2) throw new Error("Could not locate those stations. Try adding the city name.");
        line = waypoints = stops.map((s) => s.at);
        title = `${stops[0].name} to ${stops[stops.length - 1].name}`;
      }

      line = orientLine(line, stops[0]?.at, stops[stops.length - 1]?.at);
      const rough = coarse(line);

      // First thing: plot all stops & live train on the open-source map immediately!
      winReq.current++;
      railReq.current++;
      setTracing(false);
      setRes({ line, approx: rough ? [[0, line.length - 1]] : [], stops, window: null, title, liveStatus, trainNumber, startDate: trainNumber ? startDate : undefined });
      setLiveOkAt(Date.now());
      setLiveFailing(false);
      setRideKm(null);
      setManualKm(0);
      setFocusAt(null);
      setBusy(false);
      setMsg("");
      trackEvent("search", { type: trainNumber ? "train" : "stations", train: trainNumber ?? null, live: !!liveStatus?.isLive });

      // Then trace the real track if needed, and find what's outside the window along it, in the background
      if (rough) refineTrack(waypoints, line);
      else loadWindow(line);
    } catch (err) {
      trackEvent("search_failed", { query: q.trim().slice(0, 60) });
      setMsg(err instanceof Error && ["TimeoutError", "AbortError"].includes(err.name) ? "That took too long. Try again, or list fewer stations." : err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (res) return (
    <main className="stage">
      <RouteMap
        line={res.line}
        approx={res.approx}
        stops={res.stops}
        sights={res.window ?? []}
        onPick={setSel}
        liveStatus={res.liveStatus}
        trainNumber={res.trainNumber}
        onRefreshLive={res.trainNumber ? refreshLiveStatus : undefined}
        liveBearing={liveBearing}
        onRideProgress={setRideKm}
        focusAt={focusAt}
        trainAt={trainAt}
        heading={heading}
        trainMoving={trainMoving}
      />
      <div className="bar glass">
        <div className="bar-text">
          <strong>{res.title.replace(/\s*\(\d+\)$/, "")}</strong>
          <span>
            {res.trainNumber ? `${res.trainNumber} · ` : ""}
            {res.stops.length} stops
            {res.startDate ? ` · started ${dates.find((d) => d.value === res.startDate)?.label ?? res.startDate}` : ""}
            {res.window?.length ? ` · ${res.window.length} landmarks` : ""}
            {tracing ? " · tracing the rail track…" : approxKm ? ` · ${approxKm} km drawn approximately (no track data)` : ""}
            {liveFailing && liveOkAt ? ` · last updated ${Math.max(1, Math.round((Date.now() - liveOkAt) / 60000))} min ago` : ""}
          </span>
        </div>
        {res.liveStatus && "wakeLock" in navigator && (
          <button type="button" className={`bar-icon ${keepAwake ? "on" : ""}`} onClick={() => { setKeepAwake((k) => !k); trackEvent("keep_awake", { on: !keepAwake }); }} aria-pressed={keepAwake} aria-label="Keep screen on" title={keepAwake ? "Screen stays on" : "Screen may sleep"}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        )}
        <button type="button" className="bar-icon" aria-label="New search" title="New search" onClick={() => { winReq.current++; railReq.current++; setTracing(false); setWinLoading(false); setSheet(null); setRes(null); try { localStorage.removeItem(LAST_KEY); } catch {} }}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </button>
      </div>
      <WindowPanel
        items={res.window}
        loading={winLoading}
        totalKm={track?.total ?? 0}
        refKm={refKm}
        refSource={refSource}
        trainAt={trainAt}
        heading={heading}
        onScrub={(km) => { setManualKm(km); if (track) setFocusAt(pointAt(track, km).at); }}
        onPick={pickWindow}
        withHud={Boolean(res.liveStatus)}
      />
      <PlaceToast at={toastAt} items={res.window} />
      <nav className="side-bar" aria-label="What's outside the window">
        {(["left", "right"] as Side[]).map((s) => (
          <button key={s} type="button" className={`side-btn ${s}`} onClick={() => { setSheet(s); trackEvent("side_sheet", { side: s }); }}>
            <small>{s === "left" ? "On your left" : "On your right"}</small>
            <strong>{winLoading && !res.window?.length ? "…" : nowCounts[s]}</strong>
          </button>
        ))}
      </nav>
      {sheet && (
        <SideSheet
          side={sheet}
          onSide={setSheet}
          onClose={() => setSheet(null)}
          onShowOnMap={(it) => { setSheet(null); setFocusAt(it.at); }}
          items={res.window}
          loading={winLoading}
          refKm={refKm}
          trainAt={trainAt}
          heading={heading}
        />
      )}
      {sel && (
        <div className="scrim" onClick={() => setSel(null)}>
          <div className="modal glass" role="dialog" aria-modal="true" aria-label={sel.name} onClick={(e) => e.stopPropagation()}>
            <button className="x" onClick={() => setSel(null)} aria-label="Close">×</button>
            <div className="gal">{pics === null ? <p>Loading photos…</p> : pics.length ? pics.map((u) => <img key={u} src={u} alt={sel.name} loading="lazy" />) : <p>No photos found nearby.</p>}</div>
            <h2>{sel.name}</h2>
            {"side" in sel && <p className="win-modal-side">{sideText(sel)} · km {Math.round(sel.km)}</p>}
            <p>{summary ?? sel.text}</p>
            {sel.url && <a href={sel.url} target="_blank" rel="noreferrer">{sel.url.includes("wikipedia") ? "Read on Wikipedia" : "View on OpenStreetMap"}</a>}
          </div>
        </div>
      )}
    </main>
  );
  return (
    <main className="hero">
      <Globe />
      <div className="center">
        <h1>Scenic<br />Rails</h1>
        <form onSubmit={go} className="glass">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Train no. or stations, e.g. 12951" aria-label="Train number or stations" enterKeyHint="go" autoComplete="off" />
          {/^\d{4,6}$/.test(q.trim()) && dates.length > 0 && (
            <label className="start-date">
              <span>Started</span>
              <select value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-label="Train started on">
                {dates.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </label>
          )}
          <button disabled={busy || !q.trim()}>{busy ? "…" : "Go"}</button>
        </form>
        <div className="quick" aria-label="Popular trains">
          {QUICK_TRAINS.map((t) => (
            <button key={t.no} type="button" onClick={() => setQ(t.no)} className={q.trim() === t.no ? "on" : ""}>
              <strong>{t.no}</strong> {t.label}
            </button>
          ))}
        </div>
        <p className="status" role="status">{busy && <i className="spin" />}{msg}</p>
      </div>
    </main>
  );
}
