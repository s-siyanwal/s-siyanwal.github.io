/* Home "Play" section: a qubit you can steer, drawn with three.js.
   Gates are rotations of the Bloch sphere (X, Y, Z: π about x, y, z; H: π about (x+z)/√2; S: π/2 and T: π/4 about
   z). The state vector is updated exactly; the arrow animates along the rotation (instant under reduced motion).
   Rendering is on demand: frames are drawn only while a gate animates or the sphere is dragged, and nothing runs
   while the section is off-screen. Readout (amplitudes and probabilities) is plain text for screen readers. */
import * as THREE from "./vendor/three.module.min.js";

const S2 = Math.SQRT1_2;
const GATES = {
  X: { axis: [1, 0, 0], ang: Math.PI, m: [[[0, 0], [1, 0]], [[1, 0], [0, 0]]] },
  Y: { axis: [0, 1, 0], ang: Math.PI, m: [[[0, 0], [0, -1]], [[0, 1], [0, 0]]] },
  Z: { axis: [0, 0, 1], ang: Math.PI, m: [[[1, 0], [0, 0]], [[0, 0], [-1, 0]]] },
  H: { axis: [S2, 0, S2], ang: Math.PI, m: [[[S2, 0], [S2, 0]], [[S2, 0], [-S2, 0]]] },
  S: { axis: [0, 0, 1], ang: Math.PI / 2, m: [[[1, 0], [0, 0]], [[0, 0], [0, 1]]] },
  T: { axis: [0, 0, 1], ang: Math.PI / 4, m: [[[1, 0], [0, 0]], [[0, 0], [S2, S2]]] },
};
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const abs2 = (a) => a[0] * a[0] + a[1] * a[1];
const f2 = (x) => (Math.abs(x) < 5e-4 ? "0.00" : x.toFixed(2));
const cstr = (c) => (Math.abs(c[1]) < 5e-4 ? f2(c[0]) : Math.abs(c[0]) < 5e-4 ? `${f2(c[1])}i` : `(${f2(c[0])}${c[1] < 0 ? "−" : "+"}${f2(Math.abs(c[1]))}i)`);

// Physics axes (x, y, z) → three.js (x, z-up as y, y as -z) so |0⟩ is at the top.
const toGL = (v) => new THREE.Vector3(v[0], v[2], -v[1]);

export function mountQubit(host, { reduce = false } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return null; }
  const css = getComputedStyle(document.documentElement);
  const color = (n) => new THREE.Color(css.getPropertyValue(n).trim() || "#888");
  host.innerHTML = `<div class="play-stage"><div class="play-canvas"></div><div class="play-labels" aria-hidden="true"></div></div>
    <div class="play-side">
      <div class="ab-buttons" role="group" aria-label="Apply a gate">${Object.keys(GATES).map((g) => `<button type="button" class="ab-btn" data-g="${g}">${g}</button>`).join("")}</div>
      <div class="ab-buttons" role="group" aria-label="Other actions"><button type="button" class="ab-btn" data-a="measure">Measure</button><button type="button" class="ab-btn" data-a="reset">Reset to |0⟩</button></div>
      <p class="ab-readout play-read"></p><p class="ab-live" aria-live="polite"></p>
      <p class="ab-note">X, Y and Z flip the state half a turn about their axes; H swaps the poles with the equator; S and T are quarter and eighth turns about z. Measuring gives |0⟩ or |1⟩ at random with the probabilities shown.</p>
    </div>`;
  const wrap = host.querySelector(".play-canvas"), labels = host.querySelector(".play-labels");
  wrap.append(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  cam.position.set(3.4, 2.1, 4.6); cam.lookAt(0, 0, 0);
  const world = new THREE.Group(); scene.add(world);
  world.rotation.y = -0.5;
  const faint = new THREE.LineBasicMaterial({ color: color("--faint"), transparent: true, opacity: 0.32 });
  world.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(1, 18, 12)), faint));
  const accent = color("--accent");
  const ringMat = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.7 });
  world.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([...Array(96)].map((_, i) => new THREE.Vector3(Math.cos(i / 96 * 2 * Math.PI), 0, Math.sin(i / 96 * 2 * Math.PI)))), ringMat));
  const axisMat = new THREE.LineBasicMaterial({ color: color("--faint") });
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((a) => world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([toGL(a.map((v) => -1.25 * v)), toGL(a.map((v) => 1.25 * v))]), axisMat)));
  const vecMat = new THREE.MeshBasicMaterial({ color: accent });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 12), vecMat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 16), vecMat);
  world.add(shaft, head);
  const trailGeo = new THREE.BufferGeometry(), trailPts = [];
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: color("--accent-2"), transparent: true, opacity: 0.8 }));
  world.add(trail);

  const LBL = [["|0⟩", [0, 0, 1.38]], ["|1⟩", [0, 0, -1.38]], ["|+⟩", [1.38, 0, 0]], ["|+i⟩", [0, 1.38, 0]]];
  labels.innerHTML = LBL.map(([t]) => `<span>${t}</span>`).join("");
  const spans = [...labels.children];

  let psi = [[1, 0], [0, 0]], bloch = [0, 0, 1], anim = null, visible = true, frameQueued = false;
  const blochOf = (p) => { const ab = mul([p[0][0], -p[0][1]], p[1]); return [2 * ab[0], 2 * ab[1], abs2(p[0]) - abs2(p[1])]; };
  const placeArrow = (v) => {
    const g = toGL(v), len = g.length() || 1e-6, dir = g.clone().normalize();
    shaft.scale.set(1, Math.max(0.001, len - 0.16), 1);
    shaft.position.copy(dir.clone().multiplyScalar((len - 0.16) / 2));
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    head.position.copy(dir.clone().multiplyScalar(len - 0.08));
    head.quaternion.copy(shaft.quaternion);
  };
  const size = () => { const w = wrap.clientWidth || 320; renderer.setSize(w, w, false); cam.aspect = 1; cam.updateProjectionMatrix(); queue(); };
  const draw = () => {
    frameQueued = false;
    if (anim) {
      const t = Math.min(1, (performance.now() - anim.t0) / anim.dur), e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const v = new THREE.Vector3(...anim.from).applyAxisAngle(new THREE.Vector3(...anim.axis), anim.ang * e);
      placeArrow([v.x, v.y, v.z]);
      trailPts.push(toGL([v.x, v.y, v.z]).multiplyScalar(1.0));
      if (trailPts.length > 240) trailPts.shift();
      trailGeo.setFromPoints(trailPts);
      if (t >= 1) { anim = null; placeArrow(bloch); } else queue();
    }
    renderer.render(scene, cam);
    const r = renderer.domElement.getBoundingClientRect(), pr = labels.getBoundingClientRect();
    LBL.forEach(([, v], i) => {
      const p = toGL(v).applyEuler(world.rotation).project(cam);
      spans[i].style.transform = `translate(${((p.x + 1) / 2) * r.width + r.left - pr.left}px, ${((1 - p.y) / 2) * r.height + r.top - pr.top}px)`;
    });
  };
  function queue() { if (!frameQueued && visible) { frameQueued = true; requestAnimationFrame(draw); } }
  const read = host.querySelector(".play-read"), live = host.querySelector(".ab-live");
  const report = (msg) => {
    const p0 = abs2(psi[0]), p1 = abs2(psi[1]);
    read.innerHTML = `|ψ⟩ = ${cstr(psi[0])}|0⟩ + ${cstr(psi[1])}|1⟩<br>P(0) = <strong>${(p0 * 100).toFixed(1)}%</strong> · P(1) = <strong>${(p1 * 100).toFixed(1)}%</strong>`;
    live.textContent = `${msg} Probability of 0: ${(p0 * 100).toFixed(0)} percent; of 1: ${(p1 * 100).toFixed(0)} percent.`;
  };
  host.querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => {
    const G = GATES[b.dataset.g];
    const from = bloch.slice();
    psi = [add(mul(G.m[0][0], psi[0]), mul(G.m[0][1], psi[1])), add(mul(G.m[1][0], psi[0]), mul(G.m[1][1], psi[1]))];
    bloch = blochOf(psi);
    if (reduce) { placeArrow(bloch); trailPts.length = 0; trailGeo.setFromPoints(trailPts); queue(); }
    else { anim = { from, axis: G.axis, ang: G.ang, t0: performance.now(), dur: 650 }; queue(); }
    report(`Applied ${b.dataset.g}.`);
  }));
  host.querySelector('[data-a="measure"]').addEventListener("click", () => {
    const one = Math.random() < abs2(psi[1]);
    psi = one ? [[0, 0], [1, 0]] : [[1, 0], [0, 0]];
    bloch = blochOf(psi); anim = null; placeArrow(bloch); queue();
    report(`Measured ${one ? 1 : 0}; the state collapsed to |${one ? 1 : 0}⟩.`);
  });
  host.querySelector('[data-a="reset"]').addEventListener("click", () => {
    psi = [[1, 0], [0, 0]]; bloch = [0, 0, 1]; anim = null; trailPts.length = 0; trailGeo.setFromPoints(trailPts); placeArrow(bloch); queue(); report("Reset to |0⟩.");
  });

  // Drag to look around (pointer and touch); arrow keys on the canvas wrapper rotate too.
  let drag = null;
  wrap.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, ry: world.rotation.y, rx: world.rotation.x }; wrap.setPointerCapture(e.pointerId); });
  wrap.addEventListener("pointermove", (e) => {
    if (!drag) return;
    world.rotation.y = drag.ry + (e.clientX - drag.x) * 0.01;
    world.rotation.x = Math.max(-1.2, Math.min(1.2, drag.rx + (e.clientY - drag.y) * 0.01));
    queue();
  });
  wrap.addEventListener("pointerup", () => { drag = null; });
  wrap.style.touchAction = "none";
  window.addEventListener("resize", size);
  const recolour = () => {
    const c2 = getComputedStyle(document.documentElement);
    const c = (n) => new THREE.Color(c2.getPropertyValue(n).trim() || "#888");
    faint.color.copy(c("--faint")); axisMat.color.copy(c("--faint")); ringMat.color.copy(c("--accent")); vecMat.color.copy(c("--accent")); trail.material.color.copy(c("--accent-2"));
    queue();
  };
  new MutationObserver(recolour).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", recolour);
  if ("IntersectionObserver" in window) new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) queue(); }).observe(host);
  placeArrow(bloch); size(); report("Start in |0⟩.");
  return { queue };
}
