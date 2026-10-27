"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { geocodeStop, buildTrack, findSights, photos, pool, Stop, Sight, LiveTrainStatus } from "@/lib/rail";
import type { LL } from "@/lib/geo";
const Globe = dynamic(() => import("@/components/Globe"), { ssr: false });
const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

type Result = {
  line: LL[];
  stops: Stop[];
  sights: Sight[];
  title: string;
  liveStatus?: LiveTrainStatus | null;
  trainNumber?: string;
};

export default function Home() {
  const [q, setQ] = useState(""), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null), [sel, setSel] = useState<Sight | null>(null), [pics, setPics] = useState<string[] | null>(null);

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
      const r = await fetch(`/api/train?no=${encodeURIComponent(res.trainNumber)}&liveOnly=1`);
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
        const r = await fetch("/api/train?no=" + t, { signal: AbortSignal.timeout(20000) }), j = await r.json();
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

      // First thing: plot all stops & live train on the open-source map immediately!
      setRes({ line, stops, sights: [], title, liveStatus, trainNumber });
      setBusy(false);
      setMsg(bad ? `${bad} stretch(es) drawn straight: no track data` : "");

      // Then discover scenic sights along the track in the background
      findSights(line, () => {}).then((sights) => {
        setRes((prev) => (prev ? { ...prev, sights } : prev));
      }).catch(() => {});
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
        sights={res.sights}
        onPick={setSel}
        liveStatus={res.liveStatus}
        trainNumber={res.trainNumber}
        onRefreshLive={res.trainNumber ? refreshLiveStatus : undefined}
      />
      <div className="bar glass">
        <strong>{res.title}</strong>
        <span>
          {res.stops.length} stops
          {res.liveStatus ? ` • Live Tracking active` : ""}
          {res.sights.length ? ` • ${res.sights.length} scenic spots` : ""}
        </span>
        <button onClick={() => setRes(null)}>New search</button>
      </div>
      {sel && (
        <div className="scrim" onClick={() => setSel(null)}>
          <div className="modal glass" role="dialog" aria-modal="true" aria-label={sel.name} onClick={(e) => e.stopPropagation()}>
            <button className="x" onClick={() => setSel(null)} aria-label="Close">×</button>
            <div className="gal">{pics === null ? <p>Loading photos…</p> : pics.length ? pics.map((u) => <img key={u} src={u} alt={sel.name} loading="lazy" />) : <p>No photos found nearby.</p>}</div>
            <h2>{sel.name}</h2><p>{sel.text}</p>
            {sel.url && <a href={sel.url} target="_blank" rel="noreferrer">Read on Wikipedia</a>}
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
          <button disabled={busy || !q.trim()}>{busy ? "…" : "Go"}</button>
        </form>
        <p className="status" role="status">{busy && <i className="spin" />}{msg}</p>
      </div>
    </main>
  );
}
