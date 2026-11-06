"use client";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { LL } from "@/lib/geo";
import { fromMin, stopTiming, type LiveTrainStatus, type Stop } from "@/lib/rail";
import { makeTrack } from "@/lib/side";
import { AVG_KMH, buildTimeline, elapsedText, type TimelineRow } from "@/lib/timeline";
import { KIND_LABEL, sideText, type WindowItem, type WindowKind } from "@/lib/window";
import { useBackClose } from "@/lib/useBackClose";

type Props = {
  items: WindowItem[] | null;
  stops: Stop[];
  line: LL[];
  live?: LiveTrainStatus | null;
  refKm: number;
  loading: boolean;
  onPick: (it: WindowItem) => void;
  onShowOnMap: (at: LL) => void;
  onClose: () => void;
};

/** Station-kind landmarks repeat the timetable stops, so they start hidden. */
const HIDDEN_BY_DEFAULT: WindowKind[] = ["station"];

function StopRow({ row, mode, live, passed }: { row: Extract<TimelineRow, { type: "stop" }>; mode: "clock" | "elapsed"; live?: LiveTrainStatus | null; passed: boolean }) {
  const { arr, dep } = stopTiming(row.stop, live);
  const t = arr ?? dep;
  const late = t?.act && t.act !== t.sch;
  return (
    <li className={`tl-row stop ${passed ? "passed" : ""}`}>
      <span className="tl-time">
        {t ? (late ? <><s>{t.sch}</s> {t.act}</> : t.sch) : row.min === null ? "" : mode === "clock" ? `~${fromMin(row.min)}` : elapsedText(row.min)}
        {row.day > 1 && <em>Day {row.day}</em>}
      </span>
      <span className="tl-dot" aria-hidden="true" />
      <span className="tl-body">
        <strong>{row.stop.name}</strong>
        <small>
          Station{row.stop.code ? ` · ${row.stop.code}` : ""} · km {Math.round(row.km)}
          {arr && dep && arr.sch !== dep.sch ? ` · departs ${dep.act ?? dep.sch}` : ""}
          {row.stop.platform ? ` · platform ${row.stop.platform}` : ""}
        </small>
      </span>
    </li>
  );
}

function SightRow({ row, mode, delay, passed, onPick, onShowOnMap }: {
  row: Extract<TimelineRow, { type: "sight" }>; mode: "clock" | "elapsed"; delay: number; passed: boolean;
  onPick: (it: WindowItem) => void; onShowOnMap: (at: LL) => void;
}) {
  const { item: it, min } = row;
  const time = min === null ? "" : mode === "clock" ? `~${fromMin(min + delay)}` : elapsedText(min);
  return (
    <li className={`tl-row sight ${it.crossing ? "crossing" : it.side} ${passed ? "passed" : ""}`}>
      <span className="tl-time">
        {time}
        {row.day > 1 && <em>Day {row.day}</em>}
      </span>
      <span className="tl-dot" aria-hidden="true" />
      <span className="tl-body">
        <button type="button" className="tl-open" onClick={() => onPick(it)}>
          <span className="win-kind">{KIND_LABEL[it.kind]}</span>
          <strong>{it.name}</strong>
          <small>{sideText(it)} · km {Math.round(it.km)}</small>
        </button>
        <button type="button" className="tl-map" onClick={() => onShowOnMap(it.at)} aria-label={`Show ${it.name} on map`}>Map</button>
      </span>
    </li>
  );
}

/** Full-screen timeline of every stop and landmark along the journey, with estimated times. */
export default function TimelineSheet({ items, stops, line, live, refKm, loading, onPick, onShowOnMap, onClose }: Props) {
  useBackClose(true, onClose, "timeline");
  const track = useMemo(() => makeTrack(line), [line]);
  const { rows, mode, delay } = useMemo(() => buildTimeline(items, stops, track, live), [items, stops, track, live]);
  const kinds = useMemo(() => {
    const c = new Map<WindowKind, number>();
    for (const it of items ?? []) c.set(it.kind, (c.get(it.kind) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);
  const [hidden, setHidden] = useState<Set<WindowKind>>(() => new Set(HIDDEN_BY_DEFAULT));
  const [showStops, setShowStops] = useState(true);
  const shown = rows.filter((r) => (r.type === "stop" ? showStops : !hidden.has(r.item.kind)));
  const sightCount = shown.filter((r) => r.type === "sight").length;
  const showHere = refKm > 0 && refKm < track.total;
  const hereAt = showHere ? shown.findIndex((r) => r.km >= refKm) : -1;
  const nowRef = useRef<HTMLLIElement>(null);
  const scrolled = useRef(false);

  useEffect(() => {
    if (scrolled.current || !nowRef.current) return;
    scrolled.current = true;
    nowRef.current.scrollIntoView({ block: "center" });
  }, [hereAt]);

  const toggle = (k: WindowKind) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const here = (
    <li ref={nowRef} className="tl-now">
      <span className="tl-time">{mode === "clock" ? "Now" : ""}</span>
      <span className="tl-dot" aria-hidden="true" />
      <span className="tl-body"><strong>You are here</strong><small>km {Math.round(refKm)} of {Math.round(track.total)}</small></span>
    </li>
  );

  return (
    <div className="sheet timeline" role="dialog" aria-modal="true" aria-label="Timeline of sights from the whole journey">
      <header className="sheet-head" data-ptr>
        <button type="button" className="sheet-back" onClick={onClose} aria-label="Back to map">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="sheet-title">
          <strong>Timeline of sights</strong>
          <small>
            {sightCount} sights · {Math.round(track.total)} km
            {mode === "clock" ? (delay ? ` · times include ${delay} min delay` : " · estimated from the timetable") : ` · time since departure at about ${AVG_KMH} km/h`}
          </small>
        </div>
      </header>
      <div className="tl-filter" role="group" aria-label="Show kinds">
        <button type="button" className={showStops ? "on" : ""} aria-pressed={showStops} onClick={() => setShowStops((s) => !s)}>
          Stops <span>{stops.length}</span>
        </button>
        {kinds.map(([k, n]) => (
          <button key={k} type="button" className={hidden.has(k) ? "" : "on"} aria-pressed={!hidden.has(k)} onClick={() => toggle(k)}>
            {KIND_LABEL[k]} <span>{n}</span>
          </button>
        ))}
      </div>
      <div className="sheet-body" data-ptr>
        <ol className="tl-list">
          {shown.map((r, i) => (
            <Fragment key={r.key}>
              {i === hereAt && here}
              {r.type === "stop"
                ? <StopRow row={r} mode={mode} live={live} passed={showHere && r.km < refKm} />
                : <SightRow row={r} mode={mode} delay={delay} passed={showHere && r.km < refKm} onPick={onPick} onShowOnMap={onShowOnMap} />}
            </Fragment>
          ))}
          {showHere && hereAt === -1 && shown.length > 0 && here}
        </ol>
        {loading && <p className="sheet-empty"><i className="spin" /> Still finding landmarks along the track…</p>}
        {!loading && !sightCount && <p className="sheet-empty">No landmarks found within 5 km of the track.</p>}
      </div>
    </div>
  );
}
