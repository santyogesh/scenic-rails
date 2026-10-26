"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Globe() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!, w = () => el.clientWidth, h = () => el.clientHeight;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setSize(w(), h()); el.appendChild(r.domElement);
    const s = new THREE.Scene(), c = new THREE.PerspectiveCamera(45, w() / h(), 0.1, 100); c.position.z = 4.6;
    const N = 3500, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const y = 1 - (2 * (i + 0.5)) / N, rr = Math.sqrt(1 - y * y), t = i * 2.39996; pos.set([Math.cos(t) * rr * 1.5, y * 1.5, Math.sin(t) * rr * 1.5], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const globe = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xf2b84b, size: 0.018, transparent: true, opacity: 0.85 })); s.add(globe);
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 60 }, (_, i) => { const a = (i / 59) * Math.PI * 1.2 - 0.4, rr = 1.5 + Math.sin((i / 59) * Math.PI) * 0.5; return new THREE.Vector3(Math.cos(a) * rr, Math.sin(a * 1.7) * 0.5, Math.sin(a) * rr); }));
    globe.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.012, 6), new THREE.MeshBasicMaterial({ color: 0x5eead4 })));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff })); globe.add(head);
    let mx = 0, id = 0;
    const mv = (e: MouseEvent) => { mx = e.clientX / innerWidth - 0.5; };
    const rs = () => { r.setSize(w(), h()); c.aspect = w() / h(); c.updateProjectionMatrix(); };
    addEventListener("mousemove", mv); addEventListener("resize", rs);
    const tick = (t: number) => { globe.rotation.y = t / 9000 + mx * 0.6; globe.rotation.x = 0.3; head.position.copy(curve.getPoint((t / 6000) % 1)); r.render(s, c); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(id); removeEventListener("mousemove", mv); removeEventListener("resize", rs); r.dispose(); el.removeChild(r.domElement); };
  }, []);
  return <div ref={ref} className="globe" aria-hidden="true" />;
}
