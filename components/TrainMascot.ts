// Original side-profile illustration of an Indian Railways electric locomotive (WAP-7 style livery).
// Drawn facing east (right); rotate with `mascotTransform`.
export const TRAIN_MASCOT_SVG = `
<svg class="loco-svg" viewBox="0 0 96 40" width="72" height="30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g fill="none" stroke="#1f2937" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M40 9 L48 3 L56 9" />
    <path d="M44 6 L52 6" />
  </g>
  <rect x="34" y="8.5" width="28" height="2.5" rx="1" fill="#475569"/>
  <path d="M8 12 H80 Q88 12 90 19 L91 27 H6 L6 15 Q6 12 8 12 Z" fill="#c8102e" stroke="#7f1d1d" stroke-width="1"/>
  <path d="M6 20 H90.4 L90.8 23.5 H6 Z" fill="#fde8c8"/>
  <path d="M6 24.5 H90.9" stroke="#1e3a8a" stroke-width="1.2"/>
  <path d="M80.5 13.5 Q86.5 14 88.3 19 H80.5 Z" fill="#0f172a"/>
  <rect x="9" y="14" width="7" height="5" rx="1" fill="#0f172a"/>
  <rect x="22" y="14.5" width="5" height="4" rx=".6" fill="#7f1d1d" opacity=".55"/>
  <rect x="30" y="14.5" width="5" height="4" rx=".6" fill="#7f1d1d" opacity=".55"/>
  <rect x="38" y="14.5" width="5" height="4" rx=".6" fill="#7f1d1d" opacity=".55"/>
  <rect x="58" y="14.5" width="5" height="4" rx=".6" fill="#7f1d1d" opacity=".55"/>
  <rect x="66" y="14.5" width="5" height="4" rx=".6" fill="#7f1d1d" opacity=".55"/>
  <text x="48" y="23" text-anchor="middle" font-family="system-ui,sans-serif" font-size="3.4" font-weight="800" fill="#c8102e">INDIAN RAILWAYS</text>
  <circle cx="90" cy="25.5" r="1.3" fill="#fef08a"/>
  <rect x="4" y="27" width="88" height="3" rx="1" fill="#1f2937"/>
  <g fill="#111827" stroke="#9ca3af" stroke-width=".8">
    <circle cx="16" cy="32" r="4"/><circle cx="26" cy="32" r="4"/><circle cx="36" cy="32" r="4"/>
    <circle cx="60" cy="32" r="4"/><circle cx="70" cy="32" r="4"/><circle cx="80" cy="32" r="4"/>
  </g>
  <path d="M2 37 H94" stroke="#64748b" stroke-width="1"/>
</svg>`;

/** CSS transform so the loco points along `bearing` (deg from north) on a map rotated by `mapBearing`, never upside down. */
export function mascotTransform(bearing: number, mapBearing = 0): string {
  const screen = (((bearing - mapBearing) % 360) + 360) % 360;
  return screen <= 180 ? `rotate(${screen - 90}deg)` : `scaleX(-1) rotate(${270 - screen}deg)`;
}
