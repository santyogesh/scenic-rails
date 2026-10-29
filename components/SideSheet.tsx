"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LL } from "@/lib/geo";
import { photos } from "@/lib/rail";
import { compass, Relative, relativeTo, Side } from "@/lib/side";
import { KIND_LABEL, WindowItem } from "@/lib/window";
import { wikiSummary } from "@/lib/wikiWindow";
import { relLabel } from "./WindowPanel";

const NOW_KM = 15;
const BEHIND_KM = 1;
const AHEAD_KM = 60;

export type SheetRow = { it: WindowItem; r: Relative; side: Side; now: boolean; label: string };

/** Landmarks from just behind the train to 60 km ahead. Within 15 km the side is as seen from the train now; further on, the side you'll pass it on. */
export function sheetRows(items: WindowItem[] | null, refKm: number, trainAt: LL | null, heading: number): SheetRow[] {
  return (items ?? [])
    .filter((it) => it.km >= refKm - BEHIND_KM && it.km <= refKm + AHEAD_KM)
    .map((it) => {
      const now = it.km <= refKm + NOW_KM;
      const r: Relative = trainAt
        ? relativeTo(trainAt, heading, it.at)
        : { distKm: it.offsetKm, rel: it.side === "left" ? -90 : 90, side: it.side, ahead: false };
      const side = now ? r.side : it.side;
      const ahead = Math.round(it.km - refKm);
      const label = it.crossing
        ? ahead <= 0 ? "Crossing under the train now" : `Crossing in ${ahead} km`
        : now ? relLabel(r) : `In ${ahead} km, ${it.offsetKm < 0.3 ? "beside the track" : `${it.offsetKm.toFixed(1)} km off the track`} on your ${it.side}`;
      return { it, r, side, now, label };
    })
    .sort((a, b) => a.it.km - b.it.km);
}

function SheetCard({ row, onShowOnMap }: { row: SheetRow; onShowOnMap: (it: WindowItem) => void }) {
  const { it } = row;
  const ref = useRef<HTMLElement>(null);
  const [img, setImg] = useState(it.img);
  const [text, setText] = useState(it.text);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!seen) return;
    let ok = true;
    if (!it.img) photos(it).then((p) => ok && p[0] && setImg(p[0]));
    if (it.source === "wikipedia" && it.text.length < 200) wikiSummary(Number(it.id.slice(5))).then((t) => ok && t && setText(t));
    return () => {
      ok = false;
    };
  }, [seen]);

  return (
    <article ref={ref} className={`sheet-card ${it.crossing ? "crossing" : row.side}`}>
      <div className="sheet-img">{img ? <img src={img} alt={it.name} loading="lazy" /> : <span>{KIND_LABEL[it.kind]}</span>}</div>
      <div className="sheet-card-body">
        <span className="win-kind">{KIND_LABEL[it.kind]}</span>
        <h3>{it.name}</h3>
        <p className="sheet-dist">{row.label}</p>
        {text && <p className="sheet-text">{text}</p>}
        <div className="sheet-actions">
          <button type="button" onClick={() => onShowOnMap(it)}>Show on map</button>
          {it.url && <a href={it.url} target="_blank" rel="noreferrer">Read more</a>}
        </div>
      </div>
    </article>
  );
}

type Props = {
  side: Side;
  onSide: (s: Side) => void;
  onClose: () => void;
  onShowOnMap: (it: WindowItem) => void;
  items: WindowItem[] | null;
  loading: boolean;
  refKm: number;
  trainAt: LL | null;
  heading: number;
};

/** Full-screen "What's on your left / right" page. The phone's back button closes it. */
export default function SideSheet({ side, onSide, onClose, onShowOnMap, items, loading, refKm, trainAt, heading }: Props) {
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    history.pushState({ sideSheet: true }, "");
    const onPop = () => close.current();
    addEventListener("popstate", onPop);
    return () => {
      removeEventListener("popstate", onPop);
      if (history.state?.sideSheet) history.back();
    };
  }, []);

  const rows = useMemo(() => sheetRows(items, refKm, trainAt, heading), [items, refKm, trainAt?.[0], trainAt?.[1], heading]);
  const crossings = rows.filter((x) => x.it.crossing);
  const mine = rows.filter((x) => !x.it.crossing && x.side === side);
  const now = mine.filter((x) => x.now);
  const later = mine.filter((x) => !x.now);
  const count = (s: Side) => rows.filter((x) => !x.it.crossing && x.now && x.side === s).length;

  return (
    <div className={`sheet ${side}`} role="dialog" aria-modal="true" aria-label={`What's on your ${side}`}>
      <header className="sheet-head">
        <button type="button" className="sheet-back" onClick={onClose} aria-label="Back to map">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="sheet-title">
          <strong>On your {side}</strong>
          {trainAt && (
            <small>
              {Math.abs(trainAt[1]).toFixed(3)}°{trainAt[1] >= 0 ? "N" : "S"}, {Math.abs(trainAt[0]).toFixed(3)}°{trainAt[0] >= 0 ? "E" : "W"} · heading {compass(heading)}
            </small>
          )}
        </div>
      </header>
      <div className="sheet-switch" role="tablist">
        {(["left", "right"] as Side[]).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={s === side} className={`${s} ${s === side ? "on" : ""}`} onClick={() => onSide(s)}>
            {s === "left" ? "Left" : "Right"} <span>{count(s)}</span>
          </button>
        ))}
      </div>
      <div className="sheet-body">
        {crossings.map((x) => (
          <SheetCard key={x.it.id} row={x} onShowOnMap={onShowOnMap} />
        ))}
        {now.length > 0 && <h4 className="sheet-group">Right now</h4>}
        {now.map((x) => (
          <SheetCard key={x.it.id} row={x} onShowOnMap={onShowOnMap} />
        ))}
        {later.length > 0 && <h4 className="sheet-group">Coming up on your {side}</h4>}
        {later.map((x) => (
          <SheetCard key={x.it.id} row={x} onShowOnMap={onShowOnMap} />
        ))}
        {!mine.length && !crossings.length && (
          <p className="sheet-empty">{loading ? "Looking for landmarks within 5 km…" : `Nothing notable on your ${side} for the next ${AHEAD_KM} km.`}</p>
        )}
      </div>
    </div>
  );
}
