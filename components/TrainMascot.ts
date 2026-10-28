// Front view of an Indian Railways electric loco, drawn for a round map badge.
export const TRAIN_MASCOT_SVG = `
<svg class="loco-svg" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M9 2.6 L12 0.8 L15 2.6" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="5" y="3" width="14" height="14.5" rx="4" fill="#fff"/>
  <rect x="7" y="5.2" width="10" height="5.6" rx="1.6" fill="#0f172a"/>
  <path d="M7.6 6.2 L10 6.2 L8.4 9.6 L7.6 9.6 Z" fill="#fff" opacity=".35"/>
  <rect x="5" y="11.8" width="14" height="1.4" fill="#1e3a8a"/>
  <circle class="loco-hl" cx="8.4" cy="15" r="1.25" fill="#fde047"/>
  <circle class="loco-hl" cx="15.6" cy="15" r="1.25" fill="#fde047"/>
  <path d="M8 17.5 L5.6 21.6 M16 17.5 L18.4 21.6 M4.5 21.6 H19.5 M6.6 19.8 H17.4" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>
</svg>`;

/** CSS rotation for the heading arrow: `bearing` (deg from north) on a map rotated by `mapBearing`. */
export function headingTransform(bearing: number, mapBearing = 0): string {
  return `rotate(${(((bearing - mapBearing) % 360) + 360) % 360}deg)`;
}
