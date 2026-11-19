/* Sexually antagonistic selection, one locus, haploid selection (the simplest case in the repository's README).
   Males: allele A1 has viability 1+a, A2 has 1. Females: A1 has 1, A2 has 1+b. Offspring take each allele from a random
   parent. Deterministic recursion: p' = (1/2) [ p(1+a)/(1+a p) + p/(1+b(1-p)) ], with an interior balance
   p* = (ab+a-b)/(2ab) when -1 < 1/b - 1/a < 1. The simulation builds a population of N individuals from events only
   (sex by coin, survival with probability viability / largest viability in the sex, random surviving mother and father)
   and never evaluates the recursion. The start frequency is 0.1. */
import { shell, svg, el, slider, buttons, fmt } from "./ui.js";

const G = 300, P0 = 0.1;
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export function recursion(a, b, p0 = P0, gens = G) {
  const out = [p0]; let p = p0;
  for (let g = 0; g < gens; g++) { p = 0.5 * ((p * (1 + a)) / (1 + a * p) + p / (1 + b * (1 - p))); out.push(p); }
  return out;
}
export function interior(a, b) { const d = 1 / b - 1 / a; return d > -1 && d < 1; }
export const pStar = (a, b) => (a * b + a - b) / (2 * a * b);

export function simulate(a, b, N, seed, gens = G) {
  const rand = rng(seed); let al = new Uint8Array(N); // 1 = A1
  for (let i = 0; i < N; i++) al[i] = rand() < P0 ? 1 : 0;
  const out = [al.reduce((x, y) => x + y, 0) / N], vm = [1, 1 + a], vf = [1 + b, 1], mm = 1 + a, mf = 1 + b;
  for (let g = 0; g < gens; g++) {
    const M = [], F = [];
    for (let i = 0; i < N; i++) {
      if (rand() < 0.5) { if (rand() < vm[al[i]] / mm) M.push(al[i]); } else if (rand() < vf[al[i]] / mf) F.push(al[i]);
    }
    if (!M.length || !F.length) { out.push(NaN); break; }
    const nx = new Uint8Array(N);
    for (let i = 0; i < N; i++) nx[i] = rand() < 0.5 ? M[(rand() * M.length) | 0] : F[(rand() * F.length) | 0];
    al = nx; out.push(al.reduce((x, y) => x + y, 0) / N);
  }
  return out;
}

export function mount(host, { reduce }) {
  const ui = shell(host, {
    title: "A tug of war over one allele",
    lede: "Males gain a from allele A1, females gain b from A2. Start at 10% A1 and compare the maths with a simulated population.",
    note: "The simplest one-locus case from the repository's README, not a result of the project. Smaller populations drift away from the curve; with luck an allele is lost.",
  });
  const W = 640, H = 260, x0 = 44, x1 = 620, y0 = 20, y1 = 220;
  const s = svg(W, H, "Allele A1 frequency over generations: the deterministic recursion and one simulated population");
  el(s, "line", { x1: x0, x2: x1, y1: y1, y2: y1, class: "fg-ln" }); el(s, "line", { x1: x0, x2: x0, y1: y0, y2: y1, class: "fg-ln" });
  [0, 0.5, 1].forEach((v) => el(s, "text", { x: x0 - 6, y: y1 - v * (y1 - y0) + 4, class: "fg-s", "text-anchor": "end" }, String(v)));
  el(s, "text", { x: x1, y: H - 14, class: "fg-s", "text-anchor": "end" }, "generations");
  el(s, "text", { x: x0 + 6, y: y0 - 6, class: "fg-s" }, "frequency of A1");
  const star = el(s, "line", { x1: x0, x2: x1, class: "fg-faint", "stroke-dasharray": "4 4" }), starT = el(s, "text", { x: x1, class: "fg-s", "text-anchor": "end" }, "p*");
  const dp = el(s, "path", { class: "fg-ln", d: "" }), sp = el(s, "path", { class: "fg-hue", d: "" });
  el(s, "text", { x: x0, y: H - 14, class: "fg-s" }, "black: recursion · colour: simulation");
  ui.fig.append(s);
  const out = document.createElement("p"); out.className = "ab-readout";
  const X = (g) => x0 + (g / G) * (x1 - x0), Y = (p) => y1 - p * (y1 - y0);
  const path = (arr, n) => arr.slice(0, n + 1).filter((v) => !Number.isNaN(v)).map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join("");
  let a = 0.3, b = 0.3, N = 1000, det = [], sim = [], k = 0, raf = null, last = 0, seed = 1;
  const stats = () => {
    const ok = interior(a, b), end = sim.filter((v) => !Number.isNaN(v)).pop();
    star.setAttribute("opacity", ok ? 1 : 0); starT.setAttribute("opacity", ok ? 1 : 0);
    if (ok) { star.setAttribute("y1", Y(pStar(a, b))); star.setAttribute("y2", Y(pStar(a, b))); starT.setAttribute("y", Y(pStar(a, b)) - 4); }
    out.innerHTML = `${ok ? `balance p* = <strong>${fmt(pStar(a, b), 3)}</strong> (interior)` : "no interior balance: one allele takes over"} · recursion after ${G} generations: <strong>${fmt(det[G], 3)}</strong> · simulation: <strong>${fmt(end, 3)}</strong> (N = ${N})`;
    ui.live.textContent = `${ok ? `Interior balance at ${fmt(pStar(a, b), 3)}.` : "No interior balance."} After ${G} generations the recursion gives ${fmt(det[G], 3)} and the simulation ${fmt(end, 3)}.`;
  };
  const draw = () => { dp.setAttribute("d", path(det, k)); sp.setAttribute("d", path(sim, k)); };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = null; };
  const animate = () => {
    stop(); if (reduce) { k = G; draw(); return; }
    last = performance.now();
    const tick = (t) => { k = Math.min(G, k + Math.max(1, Math.round(((t - last) / 1000) * 100))); last = t; draw(); raf = k < G ? requestAnimationFrame(tick) : null; };
    raf = requestAnimationFrame(tick);
  };
  const run = () => { stop(); seed += 1; det = recursion(a, b); sim = simulate(a, b, N, seed); k = 0; stats(); animate(); };
  slider(ui.controls, { label: "Male advantage a of A1", min: 0.05, max: 0.4, step: 0.01, value: a, fmt: (v) => v.toFixed(2), onInput: (v) => { a = v; run(); } });
  slider(ui.controls, { label: "Female advantage b of A2", min: 0.05, max: 0.4, step: 0.01, value: b, fmt: (v) => v.toFixed(2), onInput: (v) => { b = v; run(); } });
  buttons(ui.controls, [["Population 100", () => { N = 100; run(); }, "100"], ["1,000", () => { N = 1000; run(); }, "1000"], ["10,000", () => { N = 10000; run(); }, "10000"]], { group: "Population size", pressed: "1000" });
  buttons(ui.controls, [["Run again", run]]);
  ui.controls.append(out);
  run();
  return { pause: stop, resume: () => { if (k < G && !raf) animate(); } };
}
