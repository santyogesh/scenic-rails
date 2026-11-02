"use client";
import { useEffect, useRef, useState } from "react";
import type { LL } from "./geo";

export type Gps = { at: LL | null; accuracy: number | null; error: string | null };

/** Live GPS position while `on`. */
export function useGps(on: boolean): Gps {
  const [s, setS] = useState<Gps>({ at: null, accuracy: null, error: null });
  useEffect(() => {
    if (!on) return;
    if (!("geolocation" in navigator)) { setS((p) => ({ ...p, error: "This browser has no GPS access." })); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => setS({ at: [p.coords.longitude, p.coords.latitude], accuracy: p.coords.accuracy, error: null }),
      (e) => setS((p) => ({ ...p, error: e.code === e.PERMISSION_DENIED ? "Location permission was denied." : "Waiting for a GPS fix…" })),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [on]);
  return s;
}

type OrientationCtor = { requestPermission?: () => Promise<"granted" | "denied"> };

/** iOS only lets a page read the compass after asking from a tap. Resolves true where no prompt is needed. */
export async function requestOrientationPermission(): Promise<boolean> {
  const D = (globalThis as any).DeviceOrientationEvent as OrientationCtor | undefined;
  if (!D?.requestPermission) return true;
  try { return (await D.requestPermission()) === "granted"; } catch { return false; }
}

export type Heading = {
  /** Where the back camera points, degrees clockwise from north. */
  heading: number | null;
  /** Camera tilt above the horizon in degrees (negative when pointing down). */
  pitch: number;
  /** The platform says the compass needs calibrating. */
  uncertain: boolean;
  /** No absolute compass reading arrived. */
  missing: boolean;
};

const R = Math.PI / 180;

/** Direction of the back camera (device -Z) in east/north/up, from W3C alpha/beta/gamma (Z-X'-Y'' order). */
function cameraVector(alpha: number, beta: number, gamma: number) {
  const cA = Math.cos(alpha * R), sA = Math.sin(alpha * R);
  const cB = Math.cos(beta * R), sB = Math.sin(beta * R);
  const cG = Math.cos(gamma * R), sG = Math.sin(gamma * R);
  return {
    back: [-(cA * sG + cG * sA * sB), -(sA * sG - cA * cG * sB), -(cB * cG)],
    top: [-cB * sA, cA * cB, sB],
  };
}

const toDeg = (x: number, y: number) => ((Math.atan2(x, y) / R) + 360) % 360;

/** Smoothed compass heading of the back camera while `on`. */
export function useHeading(on: boolean): Heading {
  const [s, setS] = useState<Heading>({ heading: null, pitch: 0, uncertain: false, missing: false });
  const sm = useRef<{ x: number; y: number } | null>(null);
  const last = useRef(0);

  useEffect(() => {
    if (!on) return;
    let gotAbsolute = false;

    const push = (raw: number, pitch: number, uncertain: boolean) => {
      const x = Math.sin(raw * R), y = Math.cos(raw * R);
      // Low-pass on the unit circle so 359 -> 1 doesn't swing through 180.
      const k = 0.25;
      sm.current = sm.current ? { x: sm.current.x + (x - sm.current.x) * k, y: sm.current.y + (y - sm.current.y) * k } : { x, y };
      const now = performance.now();
      if (now - last.current < 40) return;
      last.current = now;
      setS({ heading: toDeg(sm.current.x, sm.current.y), pitch, uncertain, missing: false });
    };

    const onEvent = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0, gamma = e.gamma ?? 0;
      const { back, top } = cameraVector(e.alpha ?? 0, beta, gamma);
      const pitch = Math.asin(Math.max(-1, Math.min(1, back[2]))) / R;
      const ios = (e as any).webkitCompassHeading;
      if (typeof ios === "number" && ios >= 0) {
        gotAbsolute = true;
        const acc = (e as any).webkitCompassAccuracy;
        const angle = screen.orientation?.angle ?? (window as any).orientation ?? 0;
        push((ios + angle + 360) % 360, pitch, typeof acc === "number" && (acc < 0 || acc > 25));
        return;
      }
      if (e.alpha === null || (e.type === "deviceorientation" && !e.absolute)) return;
      gotAbsolute = true;
      // Held upright the camera direction is well defined; lying flat, fall back to where the top of the phone points.
      const flat = Math.hypot(back[0], back[1]) < 0.35;
      const v = flat ? top : back;
      push(toDeg(v[0], v[1]), pitch, false);
    };

    const absEvent = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    addEventListener(absEvent as "deviceorientation", onEvent);
    const t = setTimeout(() => { if (!gotAbsolute) setS((p) => ({ ...p, missing: true })); }, 2500);
    return () => {
      clearTimeout(t);
      removeEventListener(absEvent as "deviceorientation", onEvent);
    };
  }, [on]);

  return s;
}
