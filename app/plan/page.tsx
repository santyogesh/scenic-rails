"use client";
import { useState } from "react";
import Link from "next/link";
import Journey from "@/components/Journey";
import { geocode, buildTrack, findSights, pool, Stop } from "@/lib/rail";
import type { Route } from "@/data/routes";

export default function Plan() {
  const [no, setNo] = useState(""), [names, setNames] = useState(""), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false), [route, setRoute] = useState<Route | null>(null);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setRoute(null);
    try {
      let list = names.split(",").map((s) => s.trim()).filter(Boolean);
      if (!list.length) {
        setMsg("Looking up train " + no);
        const r = await fetch("/api/train?no=" + encodeURIComponent(no)), j = await r.json();
        if (!r.ok) throw new Error(j.error); list = j.stops;
      }
      setMsg("Locating stations");
      const at = await pool(list, 4, geocode);
      const stops: Stop[] = list.flatMap((name, i) => (at[i] ? [{ name, at: at[i]! }] : []));
      if (stops.length < 2) throw new Error("Could not locate enough stations on the map.");
      const { line, bad } = await buildTrack(stops, setMsg);
      const sights = await findSights(line, setMsg);
      setRoute({ slug: "plan", name: no ? `Train ${no}` : "Your route", place: `${stops[0].name} to ${stops[stops.length - 1].name}`, distance: "", duration: "", blurb: "", line, sights });
      setMsg(bad ? `${bad} stretch(es) are drawn straight because track data was missing.` : "");
    } catch (err) { setMsg(err instanceof Error ? err.message : "Something went wrong."); }
    setBusy(false);
  }
  return (
    <main className="page">
      <header>
        <Link href="/">All routes</Link>
        <form className="plan" onSubmit={go}>
          <input value={no} onChange={(e) => setNo(e.target.value)} placeholder="Train number, e.g. 12951" aria-label="Train number" />
          <input value={names} onChange={(e) => setNames(e.target.value)} placeholder="or stations, comma separated (any country)" aria-label="Stations" />
          <button disabled={busy || (!no && !names)}>{busy ? "Working" : "Show route"}</button>
        </form>
        <p role="status">{msg}</p>
      </header>
      {route ? <Journey key={route.name + route.place} route={route} /> : <div className="journey" />}
    </main>
  );
}
