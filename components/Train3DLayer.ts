import maplibregl from "maplibre-gl";
import type { LL } from "@/lib/geo";

export type Train3D = {
  layer: maplibregl.CustomLayerInterface;
  /** Move the loco to `at`, facing `heading` (degrees from north). Glides from the previous pose. `glideMs` of 0 places it immediately. */
  setPose: (at: LL, heading: number, moving: boolean, glideMs?: number) => void;
};

/** Below this zoom the model is too small to read; the 2D badge is shown instead. */
export const MIN_3D_ZOOM = 10;
const LOCO_LENGTH_M = 20;
const MIN_LENGTH_PX = 110;
const FPS_IDLE = 20;

/**
 * A WAP-7 style electric loco built from simple shapes, drawn by Three.js inside MapLibre's WebGL context.
 * Model space is metres with Z up and the nose pointing +Y (north) before rotation.
 */
export async function createTrain3D(id = "train-3d"): Promise<Train3D> {
  const THREE = await import("three");

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(-30, -50, 80);
  scene.add(sun);

  const loco = new THREE.Group();
  const box = (w: number, l: number, h: number, color: number, x: number, y: number, z: number, basic = false) => {
    const mat = basic ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, l, h), mat);
    mesh.position.set(x, y, z);
    loco.add(mesh);
    return mesh;
  };

  // Soft shadow so the loco reads against busy map tiles.
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 21.5),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })
  );
  shadow.position.z = 0.05;
  loco.add(shadow);

  box(3.1, 19, 3, 0xc8102e, 0, 0, 2.7); // body
  box(3.14, 19.04, 0.5, 0xfde8c8, 0, 0, 2.55); // cream band
  box(3.14, 19.04, 0.14, 0x1e3a8a, 0, 0, 2.18); // blue line
  box(2.7, 17, 0.35, 0x475569, 0, 0, 4.35); // roof
  for (const s of [1, -1]) box(2.5, 0.12, 0.9, 0x0f172a, 0, s * 9.52, 3.4); // windscreens
  for (const s of [1, -1]) box(0.12, 2.2, 0.8, 0x0f172a, s * 1.56, 7.6, 3.4); // cab side windows
  for (const s of [1, -1]) box(0.12, 2.2, 0.8, 0x0f172a, s * 1.56, -7.6, 3.4);
  for (const y of [5.6, -5.6]) {
    box(2.6, 5, 0.8, 0x1f2937, 0, y, 0.9); // bogie
    for (const dy of [-1.8, 0, 1.8]) {
      for (const x of [1.3, -1.3]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 14), new THREE.MeshLambertMaterial({ color: 0x111827 }));
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, y + dy, 0.55);
        loco.add(wheel);
      }
    }
  }
  // Pantograph: base, two arms and the collector bar.
  box(1.2, 1.2, 0.2, 0x334155, 0, 4.2, 4.6);
  const arm = (y: number, tilt: number) => {
    const m = box(0.1, 1.9, 0.1, 0x1f2937, 0, y, 5.3);
    m.rotation.x = tilt;
  };
  arm(4.6, 0.75);
  arm(3.8, -0.75);
  box(2.2, 0.15, 0.12, 0x1f2937, 0, 4.2, 5.95);

  const lights = [box(0.5, 0.15, 0.35, 0xfde047, 0.9, 9.6, 2.0, true), box(0.5, 0.15, 0.35, 0xfde047, -0.9, 9.6, 2.0, true)];
  const lightOn = new THREE.Color(0xfde047);
  const lightOff = new THREE.Color(0x7c6a12);
  scene.add(loco);

  let map: maplibregl.Map | null = null;
  let renderer: InstanceType<typeof THREE.WebGLRenderer> | null = null;
  let from = { x: 0, y: 0, h: 0 };
  let to = { x: 0, y: 0, h: 0 };
  let lat = 0;
  let t0 = 0;
  let glide = 1500;
  let lastPose = 0;
  let moving = false;
  let placed = false;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const shortest = (a: number, b: number) => a + ((((b - a) % 360) + 540) % 360) - 180;

  const layer: maplibregl.CustomLayerInterface = {
    id,
    type: "custom",
    renderingMode: "3d",
    onAdd(m, gl) {
      map = m;
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
    },
    onRemove() {
      clearTimeout(idleTimer);
      renderer?.dispose();
      renderer = null;
      map = null;
    },
    render(_gl, matrix) {
      if (!map || !renderer || !placed || map.getZoom() < MIN_3D_ZOOM) return;
      const now = performance.now();
      const f = glide > 0 ? Math.min(1, (now - t0) / glide) : 1;
      const e = f * f * (3 - 2 * f);
      const x = from.x + (to.x - from.x) * e;
      const y = from.y + (to.y - from.y) * e;
      const h = from.h + (to.h - from.h) * e;

      const unit = maplibregl.MercatorCoordinate.fromLngLat([0, lat]).meterInMercatorCoordinateUnits();
      const mpp = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** map.getZoom());
      const s = unit * Math.max(1, (MIN_LENGTH_PX * mpp) / LOCO_LENGTH_M);

      loco.rotation.set(moving ? Math.sin(now / 260) * 0.025 : 0, 0, (-h * Math.PI) / 180);
      loco.position.z = moving ? Math.abs(Math.sin(now / 180)) * 0.08 : 0;
      const blink = Math.sin(now / 250) > 0;
      lights[0].material.color = blink ? lightOn : lightOff;
      lights[1].material.color = blink ? lightOff : lightOn;

      const world = new THREE.Matrix4().makeTranslation(x, y, 0).scale(new THREE.Vector3(s, -s, s));
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix as unknown as number[]).multiply(world);
      renderer.resetState();
      renderer.render(scene, camera);

      // Glide at full frame rate, otherwise a light idle loop for the headlights and sway.
      if (f < 1) map.triggerRepaint();
      else {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => !document.hidden && map?.triggerRepaint(), 1000 / FPS_IDLE);
      }
    },
  };

  return {
    layer,
    setPose(at, heading, isMoving, glideMs?: number) {
      const c = maplibregl.MercatorCoordinate.fromLngLat(at);
      const now = performance.now();
      const snap = glideMs === 0;
      if (!placed || snap) {
        const h = placed ? shortest(from.h, heading) : heading;
        from = to = { x: c.x, y: c.y, h };
        placed = true;
      } else {
        const f = glide > 0 ? Math.min(1, (now - t0) / glide) : 1;
        const e = f * f * (3 - 2 * f);
        from = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, h: from.h + (to.h - from.h) * e };
        to = { x: c.x, y: c.y, h: shortest(from.h, heading) };
      }
      // A ride samples every frame and snaps. Slower updates glide: the slider quickly, a live fix over ~1.5 s.
      glide = snap ? 0 : Math.min(1500, Math.max(120, now - lastPose));
      lastPose = now;
      t0 = now;
      lat = at[1];
      moving = isMoving;
      map?.triggerRepaint();
    },
  };
}
