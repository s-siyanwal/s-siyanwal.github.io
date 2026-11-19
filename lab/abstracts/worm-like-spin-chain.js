/* A worm-like chain as a planar spin chain (textbook, 2D XY version). Segments have unit tangents at angles θ_i;
   E = -J Σ cos(θ_{i+1} - θ_i). For an open chain the angle increments are independent with density ∝ exp(K cos Δ),
   K = J / kT, so ⟨t_i · t_{i+n}⟩ = r^n with r = I1(K) / I0(K) (modified Bessel functions). Samples are drawn exactly
   from that distribution. This is background physics, not the 2020 project's model or results. */
import { shell, svg, el, slider, buttons, fmt } from "./ui.js";

const N = 60;
function bessel(n, x) { let t = n === 0 ? 1 : x / 2, sum = t; for (let k = 1; k < 60; k++) { t *= (x * x) / 4 / (k * (k + n)); sum += t; } return sum; }
export const ratio = (K) => (K > 30 ? 1 - 1 / (2 * K) - 1 / (8 * K * K) : bessel(1, K) / bessel(0, K));
function increment(K) { for (;;) { const d = (Math.random() * 2 - 1) * Math.PI; if (Math.random() < Math.exp(K * (Math.cos(d) - 1))) return d; } }

export function mount(host, { reduce }) {
  const ui = shell(host, {
    title: "Stiffness of a flexible chain",
    lede: "Each segment prefers to point like its neighbour. Raise the stiffness K = J / kT and the chain straightens; lower it and it coils.",
    note: "A planar (2D) textbook chain of 60 segments, drawn from its exact distribution. It illustrates the idea behind the project's topic; it is not the project's model or data.",
  });
  const W = 640, H = 250, s = svg(W, H, "A random worm-like chain in the plane, and below it the decay of tangent correlation along the chain");
  const poly = el(s, "path", { class: "fg-hue", fill: "none", "stroke-width": 2.4, d: "" });
  const head = el(s, "circle", { r: 4, class: "fg-fill" });
  const cx0 = 360, cy0 = 20, cw = 260, ch = 90;
  el(s, "line", { x1: cx0, x2: cx0 + cw, y1: cy0 + ch, y2: cy0 + ch, class: "fg-ln" }); el(s, "line", { x1: cx0, x2: cx0, y1: cy0, y2: cy0 + ch, class: "fg-ln" });
  el(s, "text", { x: cx0 + cw, y: cy0 + ch + 18, class: "fg-s", "text-anchor": "end" }, "distance n along the chain");
  el(s, "text", { x: cx0 + 4, y: cy0 - 6, class: "fg-s" }, "⟨tᵢ · tᵢ₊ₙ⟩ = rⁿ");
  const cur = el(s, "path", { class: "fg-ln", fill: "none", d: "" });
  ui.fig.append(s);
  const out = document.createElement("p"); out.className = "ab-readout";
  let K = 5, timer = null;
  const sample = () => {
    let th = (Math.random() * 2 - 1) * 0.2, x = 0, y = 0; const pts = [[0, 0]];
    for (let i = 0; i < N; i++) { x += Math.cos(th); y += Math.sin(th); pts.push([x, y]); th += increment(K); }
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
    const sc = Math.min(8, 300 / Math.max(maxx - minx, 1), 215 / Math.max(maxy - miny, 1)), ox = 30 + (300 - (maxx - minx) * sc) / 2, oy = 17 + (215 - (maxy - miny) * sc) / 2;
    const P = pts.map(([px, py]) => [ox + (px - minx) * sc, oy + (py - miny) * sc]);
    poly.setAttribute("d", P.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(""));
    head.setAttribute("cx", P[0][0]); head.setAttribute("cy", P[0][1]);
  };
  const curve = () => {
    const r = ratio(K);
    cur.setAttribute("d", Array.from({ length: 41 }, (_, n) => `${n ? "L" : "M"}${(cx0 + (n / 40) * cw).toFixed(1)} ${(cy0 + ch - Math.pow(r, n) * ch).toFixed(1)}`).join(""));
    const lp = -1 / Math.log(r);
    out.innerHTML = `r = ⟨tᵢ · tᵢ₊₁⟩ = <strong>${fmt(r, 3)}</strong> · correlation falls to 1/e after about <strong>${fmt(lp, 1)}</strong> segments`;
    ui.live.textContent = `Stiffness ${fmt(K, 1)}: neighbouring segments have correlation ${fmt(r, 3)}; correlation falls to one over e after about ${fmt(lp, 1)} segments.`;
  };
  const stop = () => { clearInterval(timer); timer = null; };
  const go = () => { stop(); if (!reduce) timer = setInterval(sample, 1400); };
  slider(ui.controls, { label: "Stiffness K = J / kT", min: 0.5, max: 40, step: 0.5, value: K, fmt: (v) => v.toFixed(1), onInput: (v) => { K = v; curve(); sample(); } });
  buttons(ui.controls, [["New sample", () => { sample(); }]]);
  ui.controls.append(out);
  curve(); sample(); go();
  return { pause: stop, resume: go };
}
