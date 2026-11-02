"use client";
import { useEffect, useRef, useState } from "react";

const TRIGGER_PX = 80;
const MAX_PX = 130;

/**
 * Pull down to reload on touch screens. Chrome's own pull-to-refresh never fires here because the page
 * doesn't scroll and the map takes every touch, so a pull may only start inside a `[data-ptr]` zone
 * (top bar, home screen, lists) whose scrollable parts are already at the top.
 */
export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [reloading, setReloading] = useState(false);
  const pullRef = useRef(0);

  useEffect(() => {
    if (!matchMedia("(pointer: coarse)").matches) return;
    let startX = 0, startY = 0;
    let state: "idle" | "maybe" | "pulling" = "idle";

    const set = (px: number) => {
      pullRef.current = px;
      setPull(px);
    };

    const atTop = (target: Element, zone: Element) => {
      for (let el: Element | null = target; el; el = el.parentElement) {
        if (el.scrollTop > 0) return false;
        if (el === zone) return true;
      }
      return true;
    };

    const onStart = (e: TouchEvent) => {
      state = "idle";
      if (e.touches.length !== 1) return;
      const target = e.target as Element | null;
      const zone = target?.closest?.("[data-ptr]");
      if (!target || !zone || target.closest("select, input[type=range]") || !atTop(target, zone)) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      state = "maybe";
    };

    const onMove = (e: TouchEvent) => {
      if (state === "idle") return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (state === "maybe") {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (dy <= 0 || Math.abs(dx) > dy) {
          state = "idle";
          return;
        }
        state = "pulling";
      }
      if (e.cancelable) e.preventDefault();
      set(Math.min(MAX_PX, dy * 0.5));
    };

    const onEnd = () => {
      if (state === "pulling" && pullRef.current >= TRIGGER_PX) {
        setReloading(true);
        set(TRIGGER_PX);
        location.reload();
      } else {
        set(0);
      }
      state = "idle";
    };

    addEventListener("touchstart", onStart, { passive: true });
    addEventListener("touchmove", onMove, { passive: false });
    addEventListener("touchend", onEnd);
    addEventListener("touchcancel", onEnd);
    return () => {
      removeEventListener("touchstart", onStart);
      removeEventListener("touchmove", onMove);
      removeEventListener("touchend", onEnd);
      removeEventListener("touchcancel", onEnd);
    };
  }, []);

  if (!pull && !reloading) return null;
  const ready = pull >= TRIGGER_PX;
  return (
    <div className={`ptr-indicator ${ready || reloading ? "ready" : ""}`} style={{ transform: `translate(-50%, ${pull - 48}px)`, opacity: Math.min(1, pull / 40) }} role="status" aria-label={reloading ? "Reloading" : ready ? "Release to reload" : "Pull to reload"}>
      <svg viewBox="0 0 24 24" width="22" height="22" className={reloading ? "ptr-spin" : ""} style={reloading ? undefined : { transform: `rotate(${pull * 3}deg)` }} aria-hidden="true">
        <path d="M20 12a8 8 0 1 1-2.34-5.66" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M20 4v5h-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
