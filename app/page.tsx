"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { geocode, buildTrack, findSights, photos, pool, Stop, Sight } from "@/lib/rail";
import type { LL } from "@/lib/geo";
const Globe = dynamic(() => import("@/components/Globe"), { ssr: false });
const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

type Result = { line: LL[]; sights: Sight[]; title: string };

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

  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("Starting…");
    try {
      const t = q.trim(); let list: string[];
      if (/^\d{4,6}$/.test(t)) {
        setMsg("Looking up train " + t + "…");
        const r = await fetch("/api/train?no=" + t, { signal: AbortSignal.timeout(20000) }), j = await r.json();
        if (!r.ok) throw new Error(j.error); list = j.stops;
      } else list = t.split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length < 2) throw new Error("Enter a train number, or at least two stations separated by commas.");
      setMsg("Locating stations…");
      const at = await pool(list, 4, geocode);
      const stops: Stop[] = list.flatMap((name, i) => (at[i] ? [{ name, at: at[i]! }] : []));
      if (stops.length < 2) throw new Error("Could not locate those stations. Try adding the city name.");
      const { line, bad } = await buildTrack(stops, setMsg);
      const sights = await findSights(line, setMsg);
      setRes({ line, sights, title: `${stops[0].name} to ${stops[stops.length - 1].name}` });
      setMsg(bad ? `${bad} stretch(es) drawn straight: no track data` : "");
    } catch (err) {
      setMsg(err instanceof Error && ["TimeoutError", "AbortError"].includes(err.name) ? "That took too long. Try again, or list fewer stations." : err instanceof Error ? err.message : "Something went wrong.");
    } finally { setBusy(false); }
  }

  if (res) return (
    <main className="stage">
      <RouteMap line={res.line} sights={res.sights} onPick={setSel} />
      <div className="bar glass"><strong>{res.title}</strong><span>{res.sights.length} scenic spots. Tap a glowing pin.</span><button onClick={() => setRes(null)}>New search</button></div>
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
