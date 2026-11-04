"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { track as trackEvent } from "@vercel/analytics";
import { geocodeStop, traceRail, photos, pool, markStops, mergeStopTimes, Stop, Sight, LiveTrainStatus, StopTime } from "@/lib/rail";
import { useBackClose } from "@/lib/useBackClose";
import { coarse } from "@/lib/railTrack";
import { hav } from "@/lib/geo";
import type { LL } from "@/lib/geo";
import { locate, makeTrack, orientLine, pointAt, segments } from "@/lib/side";
import { mergeItems, sideText, WindowItem } from "@/lib/window";
import { wikiSummary, wikiWindow } from "@/lib/wikiWindow";
import WindowPanel from "@/components/WindowPanel";
import PlaceToast from "@/components/PlaceToast";
import SideSheet, { sheetRows } from "@/components/SideSheet";
import CountryPicker from "@/components/CountryPicker";
import { countryFromLocale, DEFAULT_COUNTRY, getCountry, isCountry, todayIn } from "@/lib/countries";
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
  /** What was searched: a train number or comma-separated stations. */
  query?: string;
  /** ISO country the journey was searched in; India when absent (journeys saved before countries existed). */
  country?: string;
  /** Transitous trip, for refreshing real-time times outside India. */
  tripId?: string;
};

const LAST_KEY = "scenic:last";
const COUNTRY_KEY = "scenic:country";
const LAST_MAX_AGE_MS = 12 * 3600000;

const isTrainNo = (s: string, country?: string) => getCountry(country).trainPattern.test(s);

/** The shareable URL of a journey: /?train=12951&date=2026-11-02, /?train=ICE%20371&c=DE or /?q=Stn1,Stn2 */
function journeyPath(query: string, date?: string, country?: string) {
  const c = country && country !== DEFAULT_COUNTRY ? `&c=${country}` : "";
  return isTrainNo(query, country) ? `/?train=${encodeURIComponent(query)}${date ? `&date=${date}` : ""}${c}` : `/?q=${encodeURIComponent(query)}${c}`;
}

const resPath = (r: Result | null) => {
  const query = r?.query ?? r?.trainNumber;
  return query ? journeyPath(query, r?.startDate, r?.country) : null;
};

function urlJourney(): { query: string; date?: string; country?: string } | null {
  const sp = new URLSearchParams(location.search);
  const query = (sp.get("train") ?? sp.get("q") ?? "").trim();
  const c = sp.get("c")?.toUpperCase();
  return query ? { query, date: sp.get("date") ?? undefined, country: isCountry(c) ? c : undefined } : null;
}

/** Today and the 4 previous days in `tz`, as journey start dates. */
function startDates(tz: string): { value: string; label: string }[] {
  const today = Date.parse(todayIn(tz));
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today - i * 86400000);
    const value = d.toISOString().slice(0, 10);
    const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    return { value, label };
  });
}

export default function Home() {
  const [q, setQ] = useState(""), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null), [sel, setSel] = useState<Sight | WindowItem | null>(null), [pics, setPics] = useState<string[] | null>(null);
  const [winLoading, setWinLoading] = useState(false), [rideKm, setRideKm] = useState<number | null>(null), [manualKm, setManualKm] = useState(0);
  const [focusAt, setFocusAt] = useState<LL | null>(null), [summary, setSummary] = useState<string | null>(null);
  const winReq = useRef(0), railReq = useRef(0), realUntil = useRef(0);
  /** A restored journey whose live position needs a refresh; and whether this tab pushed the journey's history entry. */
  const restored = useRef(false), pushedJourney = useRef(false);
  const [tracing, setTracing] = useState(false);
  const [sheet, setSheet] = useState<Side | null>(null);
  const [keepAwake, setKeepAwake] = useState(true), [liveOkAt, setLiveOkAt] = useState(0), [liveFailing, setLiveFailing] = useState(false);
  const [, setTick] = useState(0);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  /** Country of the journey on screen, read by the landmark loader. */
  const journeyCountry = useRef(DEFAULT_COUNTRY);
  const countryInfo = getCountry(country);

  // Country: the URL's, else the last one picked, else the browser's locale.
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(COUNTRY_KEY); } catch {}
    const fromUrl = new URLSearchParams(location.search).get("c")?.toUpperCase();
    setCountry(isCountry(fromUrl) ? fromUrl! : isCountry(saved) ? saved! : countryFromLocale(navigator.languages ?? [navigator.language]));
  }, []);

  function changeCountry(code: string) {
    setCountry(code);
    try { localStorage.setItem(COUNTRY_KEY, code); } catch {}
    if (!urlJourney()) history.replaceState(history.state, "", code === DEFAULT_COUNTRY ? "/" : `/?c=${code}`);
    trackEvent("country", { country: code });
  }

  // Open the journey in the URL (a reload or shared link); otherwise bring back the last one after a dropped connection.
  useEffect(() => {
    const fromUrl = urlJourney();
    let saved: { res: Result; at: number } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null");
    } catch {}
    const fresh = saved && saved.res?.line?.length >= 2 && Date.now() - saved.at < LAST_MAX_AGE_MS ? saved : null;
    const wanted = fromUrl ? journeyPath(fromUrl.query, fromUrl.date, fromUrl.country) : null;
    if (fresh && (!wanted || resPath(fresh.res) === wanted)) {
      journeyCountry.current = fresh.res.country ?? DEFAULT_COUNTRY;
      setRes(fresh.res);
      setLiveOkAt(fresh.at);
      restored.current = true;
      const path = resPath(fresh.res);
      if (!wanted && path) history.replaceState(history.state, "", path);
      if (fresh.res.approx?.length && fresh.res.stops?.length >= 2) refineTrack(fresh.res.stops.map((s: Stop) => s.at), fresh.res.line, !fresh.res.window?.length);
      else if (!fresh.res.window?.length) loadWindow(fresh.res.line);
    } else if (fromUrl) {
      setQ(fromUrl.query);
      runSearch(fromUrl.query, fromUrl.date, "none", fromUrl.country ?? DEFAULT_COUNTRY);
    }
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

  // Built on the client so "Today" is the current date in the country's timezone, not the build date.
  useEffect(() => {
    const d = startDates(getCountry(country).tz);
    setDates(d);
    const urlDate = urlJourney()?.date;
    setStartDate(d.some((x) => x.value === urlDate) ? urlDate! : d[0].value);
  }, [country]);

  useEffect(() => {
    setSummary(null);
    if (!sel || !("source" in sel) || sel.source !== "wikipedia" || sel.text.length > 160) return;
    let ok = true;
    wikiSummary(Number(sel.id.slice(5))).then((t) => ok && setSummary(t));
    return () => { ok = false; };
  }, [sel]);

  const track = useMemo(() => (res ? makeTrack(res.line) : null), [res?.line]);
  const live = res?.liveStatus;
  const liveAt = live?.currentLocation?.at;
  const liveLoc = useMemo(() => (track && liveAt ? locate(track, liveAt) : null), [track, liveAt?.[0], liveAt?.[1]]);
  // A timetable estimate is a distance along the route, so place it on the traced track by distance.
  const estKm = live?.estimated && track && live.currentLocation?.distanceFromOriginKm !== undefined
    ? Math.min(track.total, (live.currentLocation.distanceFromOriginKm * track.total) / (live.totalDistance || track.total))
    : null;
  const liveKm = estKm ?? (liveLoc && liveLoc.offsetKm < 20 ? liveLoc.km : null);
  const reportedBearing = res?.liveStatus?.currentLocation?.bearing;
  const liveBearing = track && liveKm !== null ? reportedBearing ?? pointAt(track, liveKm).bearing : undefined;
  const refSource = rideKm !== null ? "ride" : liveKm !== null ? "live" : "manual";
  const refKm = rideKm ?? liveKm ?? manualKm;
  // The train's actual coordinates and running direction; left/right in the Now view is decided from these.
  const refPoint = track ? pointAt(track, refKm) : null;
  const trainAt: LL | null = refPoint?.at ?? null;
  const liveOnTrack = useMemo(
    () => (live && refSource === "live" && trainAt && live.currentLocation ? { ...live, currentLocation: { ...live.currentLocation, at: trainAt } } : live),
    [live, refSource, trainAt?.[0], trainAt?.[1]]
  );
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

  // Landmarks within 5 km either side (10 km for big ones). Wikipedia is queried from the browser: Wikimedia rate-limits per client,
  // so shared server IPs run out quickly. OSM is split into route segments since public Overpass servers can be slow.
  function loadWindow(line: LL[]) {
    const id = ++winReq.current;
    setWinLoading(true);
    const server = (sources: string[], part = line, startKm = 0) =>
      fetch("/api/window", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ line: part, sources }) })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((j) => ((j.items ?? []) as WindowItem[]).map((it) => ({ ...it, km: Math.round((it.km + startKm) * 10) / 10 })));
    // At most 3 OSM segments in flight: public Overpass servers turn away bursts from one client.
    let slots = 3;
    const waiting: (() => void)[] = [];
    const limited = <T,>(fn: () => Promise<T>) =>
      new Promise<void>((r) => (slots > 0 ? (slots--, r()) : waiting.push(r)))
        .then(fn)
        .finally(() => { const next = waiting.shift(); next ? next() : slots++; });
    const track = makeTrack(line);
    const jobs = [
      wikiWindow(track, Date.now() + 40000),
      ...(journeyCountry.current === "IN" ? [server(["bharatlas"])] : []),
      ...segments(track, 120, 2).map((s) => limited(() => server(["osm"], s.line, s.startKm))),
    ];
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

  useBackClose(Boolean(sel), () => setSel(null), "landmark");

  useEffect(() => {
    if (!sel) { setPics(null); return; }
    let ok = true; photos(sel).then((p) => ok && setPics(p));
    const k = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    addEventListener("keydown", k);
    return () => { ok = false; removeEventListener("keydown", k); };
  }, [sel]);

  // `real` asks for the train's reported position (RailRadar, quota-limited); otherwise the timetable estimate.
  // A reported position is kept for 5 minutes before the automatic refresh goes back to estimating.
  const refreshLiveStatus = async (real = true) => {
    if (!res?.trainNumber) return;
    if (!real && Date.now() < realUntil.current) return;
    const intl = res.country && res.country !== DEFAULT_COUNTRY;
    if (intl && !res.tripId) return;
    try {
      const date = res.startDate ? `&date=${res.startDate}` : "";
      const r = await fetch(
        intl
          ? `/api/train/intl?liveOnly=1&c=${res.country}&trip=${encodeURIComponent(res.tripId!)}${date}`
          : `/api/train?no=${encodeURIComponent(res.trainNumber)}&liveOnly=1${date}${real ? "&real=1" : ""}`
      );
      if (r.ok) {
        const j = await r.json();
        if (j.liveStatus) {
          if (real && !j.liveStatus.estimated) realUntil.current = Date.now() + 5 * 60000;
          const live: LiveTrainStatus = j.liveStatus;
          const times: StopTime[] | undefined = Array.isArray(j.stopTimes) ? j.stopTimes : undefined;
          setRes((prev) => {
            if (!prev) return prev;
            const stops = markStops(mergeStopTimes(prev.stops, times), live);
            // Unchanged stops keep their identity so the map doesn't rebuild station markers (and close their popups).
            return { ...prev, liveStatus: live, stops: JSON.stringify(stops) === JSON.stringify(prev.stops) ? prev.stops : stops };
          });
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
      refreshLiveStatus(false);
    }, 25000);
    return () => clearInterval(timer);
  }, [res?.trainNumber, res?.liveStatus?.isLive]);

  // A journey restored from storage carries an old position; estimate a fresh one straight away.
  useEffect(() => {
    if (!res?.trainNumber || !restored.current) return;
    restored.current = false;
    refreshLiveStatus(false);
  }, [res?.trainNumber]);

  function clearJourney() {
    winReq.current++;
    railReq.current++;
    setTracing(false);
    setWinLoading(false);
    setSheet(null);
    setSel(null);
    setRes(null);
    pushedJourney.current = false;
    try { localStorage.removeItem(LAST_KEY); } catch {}
  }

  function newSearch() {
    if (pushedJourney.current) {
      history.back();
      return;
    }
    clearJourney();
    history.replaceState(history.state, "", "/");
  }

  // Back/Forward between the search page and journeys.
  const onHistory = useRef<() => void>(() => {});
  onHistory.current = () => {
    const u = urlJourney();
    const wanted = u ? journeyPath(u.query, u.date, u.country) : null;
    if (wanted === resPath(res)) return;
    if (!u) {
      clearJourney();
      return;
    }
    setQ(u.query);
    if (u.country) setCountry(u.country);
    if (u.date && dates.some((d) => d.value === u.date)) setStartDate(u.date);
    runSearch(u.query, u.date, "none", u.country ?? DEFAULT_COUNTRY);
  };
  useEffect(() => {
    const onPop = () => onHistory.current();
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  function go(e: React.FormEvent) {
    e.preventDefault();
    runSearch(q.trim(), startDate, "push", country);
  }

  /** `historyMode` "push" adds a history entry for the journey; "none" when the URL already names it (load, Back/Forward). */
  async function runSearch(t: string, date: string | undefined, historyMode: "push" | "none", cc: string) {
    setBusy(true); setMsg("Starting…");
    const startDate = date ?? "";
    const intl = cc !== DEFAULT_COUNTRY;
    const findStop = (s: string) => geocodeStop(s, intl ? cc : undefined);
    try {
      let line: LL[] = [];
      let stops: Stop[] = [];
      let title = "";
      let waypoints: LL[] = [];
      let liveStatus: LiveTrainStatus | null = null;
      let trainNumber: string | undefined = undefined;
      let tripId: string | undefined = undefined;

      if (isTrainNo(t, cc)) {
        trainNumber = t;
        setMsg(intl ? `Looking for train ${t} in ${getCountry(cc).name}…` : "Looking up train " + t + "…");
        const dateQs = startDate ? `&date=${startDate}` : "";
        const r = await fetch(intl ? `/api/train/intl?no=${encodeURIComponent(t)}&c=${cc}${dateQs}` : `/api/train?no=${t}${dateQs}`, { signal: AbortSignal.timeout(intl ? 58000 : 20000) }), j = await r.json();
        if (!r.ok) throw new Error(j.error);
        liveStatus = j.liveStatus || null;
        tripId = typeof j.tripId === "string" ? j.tripId : undefined;
        if (Array.isArray(j.stationStops) && j.stationStops.length >= 2) {
          stops = j.stationStops;
        }
        if (Array.isArray(j.line) && j.line.length >= 2) {
          line = j.line;
          waypoints = Array.isArray(j.waypoints) && j.waypoints.length >= 2 ? j.waypoints : stops.map((s) => s.at);
          title = j.title || `${j.stops[0]} to ${j.stops[j.stops.length - 1]}`;
        } else {
          const list: string[] = j.stops;
          const found = await pool(list, 4, findStop);
          stops = found.filter((s): s is Stop => Boolean(s));
          if (stops.length < 2) throw new Error("Could not locate those stations.");
          line = waypoints = stops.map((s) => s.at);
          title = `${stops[0].name} to ${stops[stops.length - 1].name}`;
        }
      } else {
        const list = t.split(",").map((s) => s.trim()).filter(Boolean);
        if (list.length < 2) throw new Error("Enter a train number, or at least two stations separated by commas.");
        setMsg("Locating stations…");
        const found = await pool(list, 4, findStop);
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
      const next: Result = { line, approx: rough ? [[0, line.length - 1]] : [], stops, window: null, title, liveStatus, trainNumber, startDate: trainNumber && startDate ? startDate : undefined, query: t, country: cc, tripId };
      journeyCountry.current = cc;
      setRes(next);
      if (historyMode === "push") {
        history.pushState(history.state, "", resPath(next));
        pushedJourney.current = true;
      }
      setLiveOkAt(Date.now());
      setLiveFailing(false);
      setRideKm(null);
      setManualKm(0);
      setFocusAt(null);
      setBusy(false);
      setMsg("");
      trackEvent("search", { type: trainNumber ? "train" : "stations", train: trainNumber ?? null, live: !!liveStatus?.isLive, country: cc });

      // Then trace the real track if needed, and find what's outside the window along it, in the background
      if (rough) refineTrack(waypoints, line);
      else loadWindow(line);
    } catch (err) {
      trackEvent("search_failed", { query: t.slice(0, 60), country: cc });
      if (historyMode === "none" && !res) history.replaceState(history.state, "", "/");
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
        liveStatus={liveOnTrack}
        trainNumber={res.trainNumber}
        onRefreshLive={res.trainNumber ? refreshLiveStatus : undefined}
        liveBearing={liveBearing}
        onRideProgress={setRideKm}
        focusAt={focusAt}
        trainAt={trainAt}
        heading={heading}
        trainMoving={trainMoving}
      />
      <div className="bar glass" data-ptr>
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
        <CountryPicker className="in-bar" value={res.country ?? DEFAULT_COUNTRY} onChange={(c) => { changeCountry(c); setQ(""); newSearch(); }} />
        {res.liveStatus && "wakeLock" in navigator && (
          <button type="button" className={`bar-icon ${keepAwake ? "on" : ""}`} onClick={() => { setKeepAwake((k) => !k); trackEvent("keep_awake", { on: !keepAwake }); }} aria-pressed={keepAwake} aria-label="Keep screen on" title={keepAwake ? "Screen stays on" : "Screen may sleep"}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        )}
        <Link href="/look" className="bar-icon" aria-label="Look around with camera" title="Look around with camera">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
        </Link>
        <button type="button" className="bar-icon" aria-label="New search" title="New search" onClick={newSearch}>
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
    <main className="hero" data-ptr>
      <Globe />
      <CountryPicker value={country} onChange={changeCountry} />
      <div className="center">
        <h1>Scenic<br />Rails</h1>
        <form onSubmit={go} className="glass">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={countryInfo.example} aria-label={`Train number or stations in ${countryInfo.name}`} enterKeyHint="go" autoComplete="off" />
          {isTrainNo(q.trim(), country) && dates.length > 0 && (
            <label className="start-date">
              <span>Started</span>
              <select value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-label="Train started on">
                {dates.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </label>
          )}
          <button disabled={busy || !q.trim()}>{busy ? "…" : "Go"}</button>
        </form>
        <div className="quick" aria-label={`Popular trains in ${countryInfo.name}`}>
          {countryInfo.quick.map((t) => (
            <button key={t.no} type="button" onClick={() => setQ(t.no)} className={q.trim() === t.no ? "on" : ""}>
              <strong>{t.no}</strong> {t.label}
            </button>
          ))}
        </div>
        <Link href="/look" className="look-entry">Look around with camera</Link>
        <p className="status" role="status">{busy && <i className="spin" />}{msg}</p>
        <nav className="home-links" aria-label="Site">
          <Link href="/routes">Scenic route guides</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </div>
    </main>
  );
}
