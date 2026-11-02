"use client";
import { useEffect, useMemo, useState } from "react";
import { KIND_LABEL, sideText, WindowItem } from "@/lib/window";

const AHEAD_KM = 15;
const BEHIND_KM = 1;

type Props = {
  items: WindowItem[] | null;
  loading: boolean;
  totalKm: number;
  refKm: number;
  refSource: "live" | "ride" | "manual";
  onScrub: (km: number) => void;
  onPick: (it: WindowItem) => void;
  withHud?: boolean;
};

function Card({ it, refKm, onPick }: { it: WindowItem; refKm: number; onPick: (it: WindowItem) => void }) {
  const ahead = it.km - refKm;
  return (
    <button type="button" className={`win-card ${it.side}`} onClick={() => onPick(it)}>
      {it.img && <img src={it.img} alt="" loading="lazy" />}
      <span className="win-card-body">
        <span className="win-kind">{KIND_LABEL[it.kind]}</span>
        <strong>{it.name}</strong>
        <small>
          {sideText(it)}
          {ahead > 0.5 ? ` · in ${Math.round(ahead)} km` : " · now"}
        </small>
      </span>
    </button>
  );
}

export default function WindowPanel({ items, loading, totalKm, refKm, refSource, onScrub, onPick, withHud }: Props) {
  const [tab, setTab] = useState<"now" | "all">("now");
  const [filter, setFilter] = useState<"all" | "left" | "right">("all");
  const [open, setOpen] = useState(true);
  const [top, setTop] = useState<number | undefined>(undefined);

  // Sit directly below the live status panel, whatever its height.
  useEffect(() => {
    if (!withHud) { setTop(undefined); return; }
    let hud: Element | null = null;
    const measure = () => {
      hud ??= document.querySelector(".live-hud");
      if (hud && innerWidth > 700) setTop(Math.round(hud.getBoundingClientRect().bottom + 10));
      else setTop(undefined);
    };
    const ro = new ResizeObserver(measure);
    const t = setInterval(() => {
      hud = document.querySelector(".live-hud");
      if (hud) { ro.observe(hud); measure(); clearInterval(t); }
    }, 200);
    addEventListener("resize", measure);
    return () => { clearInterval(t); ro.disconnect(); removeEventListener("resize", measure); };
  }, [withHud]);

  const near = useMemo(
    () => (items ?? []).filter((it) => it.km >= refKm - BEHIND_KM && it.km <= refKm + AHEAD_KM),
    [items, refKm]
  );
  const crossings = near.filter((it) => it.crossing);
  const left = near.filter((it) => !it.crossing && it.side === "left").sort((a, b) => a.km - b.km);
  const right = near.filter((it) => !it.crossing && it.side === "right").sort((a, b) => a.km - b.km);
  const next = (items ?? []).find((it) => it.km > refKm + AHEAD_KM);
  const list = (items ?? []).filter((it) => filter === "all" || it.side === filter || it.crossing);
  const counts = useMemo(() => {
    const c = { left: 0, right: 0 };
    for (const it of items ?? []) c[it.side]++;
    return c;
  }, [items]);

  return (
    <section
      className={`win glass ${withHud ? "with-hud" : ""} ${open ? "" : "closed"}`}
      style={top !== undefined ? { top } : undefined}
      aria-label="What's outside the window"
    >
      <header className="win-head">
        <button type="button" className="win-title" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span>Outside the window</span>
          <small>
            {loading && !items?.length ? "Scanning 5 km either side…" : `${items?.length ?? 0} landmarks · ${counts.left} left · ${counts.right} right`}
          </small>
        </button>
        {open && (
          <div className="win-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "now"} className={tab === "now" ? "on" : ""} onClick={() => setTab("now")}>Now</button>
            <button type="button" role="tab" aria-selected={tab === "all"} className={tab === "all" ? "on" : ""} onClick={() => setTab("all")}>Full list</button>
          </div>
        )}
      </header>

      {open && tab === "now" && (
        <div className="win-body">
          <div className="win-pos">
            <span className={`win-src ${refSource}`}>{refSource === "live" ? "Live train" : refSource === "ride" ? "Riding" : "You are at"}</span>
            <strong>km {Math.round(refKm)}</strong>
            <span className="win-of">of {Math.round(totalKm)}</span>
            {loading && <i className="spin" aria-label="Loading more landmarks" />}
          </div>
          {refSource === "manual" && totalKm > 0 && (
            <input
              className="win-scrub"
              type="range"
              min={0}
              max={Math.round(totalKm)}
              step={1}
              value={Math.round(refKm)}
              onChange={(e) => onScrub(Number(e.target.value))}
              aria-label="Move along the route"
            />
          )}
          {crossings.map((it) => (
            <button key={it.id} type="button" className="win-crossing" onClick={() => onPick(it)}>
              {it.kind === "bridge" ? "Over " : "Crossing "}<strong>{it.name}</strong>
              <small>{it.km - refKm > 0.5 ? ` in ${Math.round(it.km - refKm)} km` : " now"}</small>
            </button>
          ))}
          <div className="win-cols">
            <div className="win-col">
              <h4>On your left</h4>
              {left.length ? left.map((it) => <Card key={it.id} it={it} refKm={refKm} onPick={onPick} />) : <p className="win-empty">{loading ? "Looking…" : "Fields and countryside"}</p>}
            </div>
            <div className="win-col">
              <h4>On your right</h4>
              {right.length ? right.map((it) => <Card key={it.id} it={it} refKm={refKm} onPick={onPick} />) : <p className="win-empty">{loading ? "Looking…" : "Fields and countryside"}</p>}
            </div>
          </div>
          {next && (
            <p className="win-next">
              Next up at km {Math.round(next.km)}: <strong>{next.name}</strong> on your {next.side}
            </p>
          )}
        </div>
      )}

      {open && tab === "all" && (
        <div className="win-body">
          <div className="win-filter">
            {(["all", "left", "right"] as const).map((f) => (
              <button key={f} type="button" className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f === "left" ? `Left (${counts.left})` : `Right (${counts.right})`}
              </button>
            ))}
          </div>
          <ol className="win-list">
            {list.map((it) => (
              <li key={it.id}>
                <button type="button" className={`win-row ${it.side}`} onClick={() => { onScrub(it.km); onPick(it); }}>
                  <span className="win-km">{Math.round(it.km)}<small>km</small></span>
                  <span className="win-row-body">
                    <strong>{it.name}</strong>
                    <small>{KIND_LABEL[it.kind]} · {sideText(it)}</small>
                  </span>
                </button>
              </li>
            ))}
            {!list.length && <li className="win-empty">{loading ? "Scanning the corridor…" : "Nothing found within 5 km of the track."}</li>}
          </ol>
        </div>
      )}
    </section>
  );
}
