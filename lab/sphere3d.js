/* A small three.js Bloch sphere for the "On this page" navigator. The state vector tracks reading progress
   (|0⟩ at the top of the page, |1⟩ at the bottom) and precesses as you scroll; the sphere turns slightly with
   scroll velocity. Rendered on demand (only when progress or velocity changes), decorative and aria-hidden:
   the links next to it are the real navigation. */
import * as THREE from "./vendor/three.module.min.js";

const cssColor = (name) => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim());

export function mountSphere(host, { getProgress, getVelocity }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); } catch (e) { return null; }
  const S = 96;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(S, S);
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.className = "bn-canvas";
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  camera.position.set(2.6, 1.4, 3.6); camera.lookAt(0, 0, 0);
  const group = new THREE.Group(); scene.add(group);

  const wireMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.35 });
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(1, 14, 8)), wireMat);
  group.add(wire);
  const ringMat = new THREE.LineBasicMaterial();
  const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 64 }, (_, i) => new THREE.Vector3(Math.cos(i / 64 * Math.PI * 2), 0, Math.sin(i / 64 * Math.PI * 2)))), ringMat);
  group.add(ring);
  const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.25, 0), new THREE.Vector3(0, 1.25, 0)]), wireMat);
  group.add(axis);
  const vecMat = new THREE.LineBasicMaterial();
  const vecGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
  const vec = new THREE.Line(vecGeo, vecMat); group.add(vec);
  const tipMat = new THREE.MeshBasicMaterial();
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), tipMat); group.add(tip);

  const recolour = () => {
    const ink = cssColor("--faint"), acc = cssColor("--accent");
    wireMat.color.copy(ink); ringMat.color.copy(acc); vecMat.color.copy(acc); tipMat.color.copy(acc);
  };
  let spin = 0, queued = false;
  const draw = () => {
    queued = false;
    const p = Math.min(1, Math.max(0, getProgress()));
    const th = Math.PI * p, ph = Math.PI * 3 * p;
    const v = new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
    vecGeo.setFromPoints([new THREE.Vector3(), v]); tip.position.copy(v);
    spin += Math.max(-30, Math.min(30, getVelocity())) * 0.002;
    group.rotation.y = spin;
    renderer.render(scene, camera);
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };
  window.addEventListener("scroll", queue, { passive: true });
  new MutationObserver(() => { recolour(); queue(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { recolour(); queue(); });
  recolour(); draw();
  return { update: queue };
}
