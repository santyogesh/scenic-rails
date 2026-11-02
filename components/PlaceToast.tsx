"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { hav, LL } from "@/lib/geo";
import { Place, placeCell, whereAmI } from "@/lib/placeInfo";
import type { WindowItem, WindowKind } from "@/lib/window";

const NATURAL: WindowKind[] = ["river", "waterfall", "lake", "dam", "wildlife", "hill", "beach"];
const NEAR_KM = 25;
const SHOW_MS = 8000;

const list = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);

/** "You're in X district, State, famous for ..." shown on open and whenever the district changes. */
export default function PlaceToast({ at, items }: { at: LL | null; items: WindowItem[] | null }) {
  const [place, setPlace] = useState<Place | null>(null);
  const [visible, setVisible] = useState(false);
  const shown = useRef<string | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const cell = at ? placeCell(at) : null;

  useEffect(() => {
    if (!at) return;
    let ok = true;
    whereAmI(at).then((p) => {
      const key = p.district ?? p.state;
      if (!ok || !key || key === shown.current) return;
      shown.current = key;
      setPlace(p);
      setVisible(true);
    });
    return () => {
      ok = false;
    };
  }, [cell]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), SHOW_MS);
    return () => clearTimeout(t);
  }, [visible, place]);

  const famous = useMemo(() => {
    if (!at) return [];
    return (items ?? [])
      .filter((it) => NATURAL.includes(it.kind))
      .map((it) => ({ it, d: hav(at, it.at) }))
      .filter((x) => x.d <= NEAR_KM)
      .sort((a, b) => a.d - b.d)
      .reduce<string[]>((acc, x) => (acc.length < 3 && !acc.includes(x.it.name) ? [...acc, x.it.name] : acc), []);
  }, [items, at?.[0], at?.[1]]);

  if (!visible || !place) return null;
  const district = place.district ? (/district$/i.test(place.district) ? place.district : `${place.district} district`) : null;
  const where = [district, place.state].filter(Boolean).join(", ");

  return (
    <div
      className="place-toast glass"
      role="status"
      onClick={() => setVisible(false)}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const s = touch.current;
        const t = e.changedTouches[0];
        if (s && (Math.abs(t.clientX - s.x) > 60 || t.clientY - s.y > 40)) setVisible(false);
      }}
    >
      <p>
        You&apos;re in <strong>{where}</strong>
        {famous.length ? <>, famous for <strong>{list(famous)}</strong>.</> : "."}
      </p>
      {place.blurb && <small>{place.blurb}</small>}
      <button type="button" className="place-toast-x" aria-label="Dismiss">×</button>
    </div>
  );
}
