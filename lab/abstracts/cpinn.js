/* NMR pulse design, one spin (textbook). In the rotating frame the magnetisation M of a spin-1/2 follows dM/dt = ω × M
   with ω = (Ω, 0, Δ): Ω is the radio-frequency amplitude and Δ the offset of the pulse from resonance. Starting from +z,
   M turns about ω by the angle |ω| T. A 90° pulse on resonance (ΩT = π/2) takes M to -y. Designing a pulse means choosing
   the controls so the final state matches a target; a physics-informed method automates that search. This is background
   for the topic, not the project's architecture or results. */
import { shell, svg, el, slider, buttons, fmt } from "./ui.js";

export function rotate(Om, De, t) {
  const w = Math.hypot(Om, De); if (w < 1e-12) return [0, 0, 1];
  const n = [Om / w, 0, De / w], a = w * t, c = Math.cos(a), s = Math.sin(a), v = [0, 0, 1];
  const cr = [n[1] * v[2] - n[2] * v[1], n[2] * v[0] - n[0] * v[2], n[0] * v[1] - n[1] * v[0]], d = n[0] * v[0] + n[1] * v[1] + n[2] * v[2];
  return [0, 1, 2].map((i) => v[i] * c + cr[i] * s + n[i] * d * (1 - c));
}

export function mount(host, { reduce }) {
  const ui = shell(host, {
    title: "Steer a spin with a radio-frequency pulse",
    lede: "The target is a 90° pulse: the arrow should end on the −y axis. Tune the amplitude and the offset, then play the pulse.",
    note: "A single spin without relaxation, the textbook picture behind NMR pulse design. Time runs from 0 to 1 in arbitrary units.",
  });
  const R = 100, cx = 160, cy = 125, az = 0.6, el_ = 0.35, ca = Math.cos(az), sa = Math.sin(az), se = Math.sin(el_), ce = Math.cos(el_);
  const proj = ([x, y, z]) => [cx + R * (x * ca + y * sa), cy - R * (z * ce + (-x * sa + y * ca) * se)];
  const s = svg(340, 250, "Bloch sphere with the magnetisation arrow, its path, and the target marked");
  el(s, "circle", { cx, cy, r: R, class: "fg-faint", fill: "none" });
  el(s, "ellipse", { cx, cy, rx: R, ry: R * se, class: "fg-faint", fill: "none", "stroke-dasharray": "3 4" });
  [["x", [1.18, 0, 0]], ["y", [0, 1.18, 0]], ["z", [0, 0, 1.18]]].forEach(([n, p]) => {
    const [px, py] = proj(p), [qx, qy] = proj([0, 0, 0]);
    el(s, "line", { x1: qx, y1: qy, x2: px, y2: py, class: "fg-faint" }); el(s, "text", { x: px + 4, y: py + 4, class: "fg-s" }, n);
  });
  const [tx, ty] = proj([0, -1, 0]);
  el(s, "circle", { cx: tx, cy: ty, r: 7, class: "fg-hbox", fill: "none" }); el(s, "text", { x: tx - 12, y: ty + 18, class: "fg-s", "text-anchor": "end" }, "target");
  const trail = el(s, "path", { class: "fg-hue", fill: "none", d: "" });
  const arr = el(s, "line", { x1: cx, y1: cy, class: "fg-ln", "stroke-width": 2.4 }), dot = el(s, "circle", { r: 5, class: "fg-fill" });
  ui.fig.append(s);
  const out = document.createElement("p"); out.className = "ab-readout";
  let Om = 1.2, De = 0, t = 1, raf = null, last = 0;
  const draw = () => {
    const m = rotate(Om, De, t), [px, py] = proj(m);
    arr.setAttribute("x2", px); arr.setAttribute("y2", py); dot.setAttribute("cx", px); dot.setAttribute("cy", py);
    trail.setAttribute("d", Array.from({ length: 41 }, (_, i) => { const q = proj(rotate(Om, De, (t * i) / 40)); return `${i ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`; }).join(""));
    const err = Math.hypot(m[0], m[1] + 1, m[2]);
    out.innerHTML = `turn angle |ω|T = <strong>${fmt(Math.hypot(Om, De) * t, 2)}</strong> rad · M<sub>z</sub> = <strong>${fmt(m[2], 2)}</strong> · distance to target = <strong>${fmt(err, 2)}</strong>`;
    return err;
  };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = null; };
  const play = () => {
    stop(); if (reduce) { t = 1; announce(); return; }
    t = 0; last = performance.now();
    const tick = (now) => { t = Math.min(1, t + (now - last) / 2500); last = now; draw(); if (t < 1) raf = requestAnimationFrame(tick); else { raf = null; announce(); } };
    raf = requestAnimationFrame(tick);
  };
  const announce = () => { const e = draw(); ui.live.textContent = `Final state: distance to the target ${fmt(e, 2)}. ${e < 0.1 ? "On target." : "Not on target yet."}`; };
  const upd = () => { stop(); t = 1; announce(); };
  slider(ui.controls, { label: "RF amplitude Ω (rad per unit time)", min: 0, max: 6.3, step: 0.05, value: Om, fmt: (v) => v.toFixed(2), onInput: (v) => { Om = v; upd(); } });
  slider(ui.controls, { label: "Offset Δ from resonance", min: -3, max: 3, step: 0.05, value: De, fmt: (v) => v.toFixed(2), onInput: (v) => { De = v; upd(); } });
  buttons(ui.controls, [["Play the pulse", play]]);
  ui.controls.append(out);
  announce();
  return { pause: stop, resume: () => {} };
}
