"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { geocodeStop, buildTrack, photos, pool, Stop, Sight, LiveTrainStatus } from "@/lib/rail";
import type { LL } from "@/lib/geo";
import { locate, makeTrack, orientLine, pointAt } from "@/lib/side";
import { mergeItems, sideText, WindowItem } from "@/lib/window";
import { wikiSummary, wikiWindow } from "@/lib/wikiWindow";
import WindowPanel from "@/components/WindowPanel";
const Globe = dynamic(() => import("@/components/Globe"), { ssr: false });
const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

type Result = {
  line: LL[];
  stops: Stop[];
  window: WindowItem[] | null;
  title: string;
  liveStatus?: LiveTrainStatus | null;
  trainNumber?: string;
  startDate?: string;
};

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
  const winReq = useRef(0);
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
        }
      }
    } catch {}
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
      let bad = 0;
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
          title = j.title || `${j.stops[0]} to ${j.stops[j.stops.length - 1]}`;
        } else {
          const list: string[] = j.stops;
          const found = await pool(list, 4, geocodeStop);
          stops = found.filter((s): s is Stop => Boolean(s));
          if (stops.length < 2) throw new Error("Could not locate those stations.");
          const built = await buildTrack(stops, setMsg);
          line = built.line;
          bad = built.bad;
          title = `${stops[0].name} to ${stops[stops.length - 1].name}`;
        }
      } else {
        const list = t.split(",").map((s) => s.trim()).filter(Boolean);
        if (list.length < 2) throw new Error("Enter a train number, or at least two stations separated by commas.");
        setMsg("Locating stations on RailRadar…");
        const found = await pool(list, 4, geocodeStop);
        stops = found.filter((s): s is Stop => Boolean(s));
        if (stops.length < 2) throw new Error("Could not locate those stations. Try adding the city name.");
        const built = await buildTrack(stops, setMsg);
        line = built.line;
        bad = built.bad;
        title = `${stops[0].name} to ${stops[stops.length - 1].name}`;
      }

      line = orientLine(line, stops[0]?.at, stops[stops.length - 1]?.at);

      // First thing: plot all stops & live train on the open-source map immediately!
      setRes({ line, stops, window: null, title, liveStatus, trainNumber, startDate: trainNumber ? startDate : undefined });
      setRideKm(null);
      setManualKm(0);
      setFocusAt(null);
      setBusy(false);
      setMsg(bad ? `${bad} stretch(es) drawn straight: no track data` : "");

      // Then find what's outside the window along the track in the background
      loadWindow(line);
    } catch (err) {
      setMsg(err instanceof Error && ["TimeoutError", "AbortError"].includes(err.name) ? "That took too long. Try again, or list fewer stations." : err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (res) return (
    <main className="stage">
      <RouteMap
        line={res.line}
        stops={res.stops}
        sights={res.window ?? []}
        onPick={setSel}
        liveStatus={res.liveStatus}
        trainNumber={res.trainNumber}
        onRefreshLive={res.trainNumber ? refreshLiveStatus : undefined}
        liveBearing={liveBearing}
        onRideProgress={setRideKm}
        focusAt={focusAt}
      />
      <div className="bar glass">
        <strong>{res.title}</strong>
        <span>
          {res.stops.length} stops
          {res.startDate ? ` • started ${dates.find((d) => d.value === res.startDate)?.label ?? res.startDate}` : ""}
          {res.liveStatus ? ` • Live Tracking active` : ""}
          {res.window?.length ? ` • ${res.window.length} landmarks within 5 km` : ""}
        </span>
        <button onClick={() => { winReq.current++; setWinLoading(false); setRes(null); }}>New search</button>
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
        <h1>Rail<br />Vista</h1>
        <form onSubmit={go} className="glass">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Train number (12951) or stations: Mumbai, Surat, Vadodara" aria-label="Train number or stations" autoFocus />
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
        <p className="status" role="status">{busy && <i className="spin" />}{msg}</p>
      </div>
    </main>
  );
}
