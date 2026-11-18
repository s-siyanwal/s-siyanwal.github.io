/* VQLS for time-series forecasting.
   A 2×2 linear system A x = b like the one in the paper (there, A comes from a Hankel-like trajectory matrix of
   Reliance closing prices). You set A and b; the one-parameter ansatz |x(θ)⟩ = RY(θ)|0⟩ is scored by the global
   VQLS cost C(θ) = 1 − |⟨b|A|x(θ)⟩|² / ‖A|x(θ)⟩‖², which is zero exactly when A|x⟩ points along |b⟩. "Optimise"
   runs a derivative-free search, as COBYLA does in the paper. All values are computed live; none are the paper's. */
import { shell, svg, el, slider, buttons, fmt } from "./ui.js";

export function mount(host, { reduce }) {
  const ui = shell(host, {
    title: "Solving A x = b with a variational circuit",
    lede: "Shape the matrix and the target vector, then move θ by hand or let the optimiser find the minimum of the cost.",
    note: "Toy system computed in your browser. In the paper the cost is estimated with Hadamard-test circuits (10,000 shots each), A is decomposed into Pauli terms, and a SWAP test turns the solution into the next-day forecast.",
  });
  let a = 1.0, c = 0.35, d = 0.6, beta = 0.6, theta = 2.6, timer = null;
  const W = 640, H = 250, px0 = 50, px1 = 610, py0 = 30, py1 = 200;
  const s = svg(W, H, "Cost C(theta) for theta from 0 to 2 pi, with the current theta marked");
  el(s, "line", { x1: px0, x2: px1, y1: py1, y2: py1, class: "fg-faint" });
  el(s, "line", { x1: px0, x2: px0, y1: py0, y2: py1, class: "fg-faint" });
  el(s, "text", { x: px0 - 8, y: py0 + 4, "text-anchor": "end", class: "fg-s" }, "1");
  el(s, "text", { x: px0 - 8, y: py1 + 4, "text-anchor": "end", class: "fg-s" }, "0");
  el(s, "text", { x: px1, y: py1 + 22, "text-anchor": "end", class: "fg-s" }, "θ = 2π");
  el(s, "text", { x: px0, y: py1 + 22, class: "fg-s" }, "θ = 0");
  el(s, "text", { x: px0 + 6, y: py0 - 10, class: "fg-s" }, "cost C(θ)");
  const curve = el(s, "path", { class: "fg-hue" });
  const marker = el(s, "circle", { r: 7, class: "fg-fill" });
  const guide = el(s, "line", { y1: py0, y2: py1, class: "fg-faint", "stroke-dasharray": "3 4" });
  ui.fig.append(s);
  const X = (t) => px0 + (t / (2 * Math.PI)) * (px1 - px0), Y = (v) => py1 - v * (py1 - py0);

  const cost = (t) => {
    const x0 = Math.cos(t / 2), x1 = Math.sin(t / 2);
    const y0 = a * x0 + c * x1, y1 = c * x0 + d * x1;            // A|x⟩
    const nn = y0 * y0 + y1 * y1;
    if (nn < 1e-12) return 1;
    const ov = Math.cos(beta) * y0 + Math.sin(beta) * y1;         // ⟨b|A|x⟩
    return Math.max(0, 1 - (ov * ov) / nn);
  };
  const out = document.createElement("p");
  out.className = "ab-readout";
  const draw = () => {
    let dpath = "";
    for (let k = 0; k <= 180; k++) { const t = (k / 180) * 2 * Math.PI; dpath += `${k ? "L" : "M"}${X(t).toFixed(1)} ${Y(cost(t)).toFixed(1)}`; }
    curve.setAttribute("d", dpath);
    marker.setAttribute("cx", X(theta)); marker.setAttribute("cy", Y(cost(theta)));
    guide.setAttribute("x1", X(theta)); guide.setAttribute("x2", X(theta));
    const det = a * d - c * c;
    let fid = NaN;
    if (Math.abs(det) > 1e-6) {
      const b0 = Math.cos(beta), b1 = Math.sin(beta);
      let s0 = (d * b0 - c * b1) / det, s1 = (-c * b0 + a * b1) / det; const n = Math.hypot(s0, s1); s0 /= n; s1 /= n;
      const f = s0 * Math.cos(theta / 2) + s1 * Math.sin(theta / 2); fid = f * f;
      out.innerHTML = `A = [[${fmt(a, 2)}, ${fmt(c, 2)}], [${fmt(c, 2)}, ${fmt(d, 2)}]] · |b⟩ = (${fmt(b0, 2)}, ${fmt(b1, 2)})<br>
        classical solution x* ∝ (${fmt(s0, 3)}, ${fmt(s1, 3)}) · C(θ) = <strong>${fmt(cost(theta), 4)}</strong> · overlap with x*: <strong>${fmt(fid, 4)}</strong>`;
    } else out.innerHTML = "A is singular: no unique solution. Move a slider.";
    ui.live.textContent = `theta ${theta.toFixed(2)}, cost ${fmt(cost(theta), 4)}${Number.isFinite(fid) ? `, overlap with the exact solution ${fmt(fid, 3)}` : ""}.`;
  };
  slider(ui.controls, { label: "A₁₁", min: 0.1, max: 2, step: 0.01, value: a, fmt: (v) => v.toFixed(2), onInput: (v) => { a = v; draw(); } });
  slider(ui.controls, { label: "A₁₂ = A₂₁", min: -1, max: 1, step: 0.01, value: c, fmt: (v) => v.toFixed(2), onInput: (v) => { c = v; draw(); } });
  slider(ui.controls, { label: "A₂₂", min: 0.1, max: 2, step: 0.01, value: d, fmt: (v) => v.toFixed(2), onInput: (v) => { d = v; draw(); } });
  slider(ui.controls, { label: "Direction of b", min: 0, max: 3.14, step: 0.01, value: beta, fmt: (v) => `${v.toFixed(2)} rad`, onInput: (v) => { beta = v; draw(); } });
  const th = slider(ui.controls, { label: "Ansatz angle θ", min: 0, max: 6.28, step: 0.01, value: theta, fmt: (v) => v.toFixed(2), onInput: (v) => { theta = v; draw(); } });

  // Derivative-free pattern search: try ±step, keep improvements, halve the step otherwise (COBYLA-like in spirit).
  let step = 0.8;
  const stop = () => { clearInterval(timer); timer = null; };
  const iterate = () => {
    const f0 = cost(theta), up = cost(theta + step), dn = cost(theta - step);
    if (up < f0 && up <= dn) theta += step; else if (dn < f0) theta -= step; else step /= 2;
    theta = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    th.input.value = theta; th.input.dispatchEvent(new Event("input"));
    if (step < 1e-4) stop();
  };
  buttons(ui.controls, [["Optimise", () => {
    stop(); step = 0.8;
    if (reduce) { for (let i = 0; i < 200 && step >= 1e-4; i++) iterate(); return; }
    timer = setInterval(iterate, 120);
  }], ["Stop", stop]]);
  ui.controls.append(out);
  draw();
  return { pause: stop, resume: () => {} };
}
