/* Quantum image representation QNNs.
   1) Edit a 2×2 grey-scale image and watch it become a 2-qubit state by amplitude encoding (the idea behind NASS:
      amplitudes proportional to normalised pixel values). Textbook maths, computed live.
   2) Explore the results reported in the paper: best test accuracies (with their conditions) and the circuit cost
      of QBIR vs FRQCI at 16×16. Every number here is quoted from the paper's write-up on this site. */
import { shell, svg, el, buttons, fmt } from "./ui.js";

const ACC = [ // [model, accuracy, ±, condition]
  ["HCQNN", 0.9756, 0.0076, "2×2, noiseless, two-design ansatz"],
  ["QBIR", 0.9396, 0.0140, "2×2, noiseless, two-design ansatz"],
  ["NASS", 0.8928, 0.0196, "best case, low resolution"],
  ["FTQR / FRQCI", 0.61, 0, "≈ 0.50–0.61, near chance"],
];
const COST = [["QBIR", 5612, 9701, 16], ["FRQCI", 125299, 164353, 11]]; // depth, gates, qubits at 16×16

export function mount(host) {
  const ui = shell(host, {
    title: "Pixels into qubits, and what it costs",
    lede: "Click a pixel to change its brightness. Four pixels need only two qubits when the brightness values become amplitudes.",
    note: "The encoder is a generic amplitude encoding for intuition; the paper defines and compares NASS, QBIR, FTQR and FRQCI precisely. Accuracy and cost figures are as reported in the paper (mean ± σ over 20 seeds).",
  });
  const px = [0.9, 0.2, 0.5, 0.7];
  const s = svg(640, 230, "A 2 by 2 image and the amplitudes of the 2-qubit state that encodes it", { interactive: true });
  const tiles = px.map((_, i) => {
    const r = el(s, "rect", { x: 20 + (i % 2) * 90, y: 20 + Math.floor(i / 2) * 90, width: 86, height: 86, rx: 4, tabindex: 0, role: "button", class: "ab-pixel", "aria-label": `Pixel ${i + 1}` });
    const bump = () => { px[i] = px[i] >= 1 ? 0 : Math.min(1, Math.round((px[i] + 0.25) * 4) / 4); draw(); };
    r.addEventListener("click", bump);
    r.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); bump(); } });
    return r;
  });
  el(s, "text", { x: 110, y: 222, "text-anchor": "middle", class: "fg-s" }, "image (click to edit)");
  el(s, "path", { d: "M215 105 h44 m-8 -6 l8 6 l-8 6", class: "fg-ln" });
  el(s, "text", { x: 240, y: 95, "text-anchor": "middle", class: "fg-s" }, "encode");
  const bars = px.map((_, i) => {
    const x = 300 + i * 80;
    el(s, "line", { x1: x - 10, x2: x + 60, y1: 190, y2: 190, class: "fg-faint" });
    el(s, "text", { x: x + 25, y: 210, "text-anchor": "middle", class: "fg-s" }, `|${(i >> 1)}${i & 1}⟩`);
    return [el(s, "rect", { x, y: 190, width: 50, height: 0, class: "fg-fill" }), el(s, "text", { x: x + 25, y: 180, "text-anchor": "middle", class: "fg-s" }, "")];
  });
  ui.fig.append(s);

  const res = document.createElement("div");
  res.className = "ab-results";
  ui.fig.append(res);
  const showAcc = () => {
    res.innerHTML = `<p class="ab-k">Best reported test accuracy</p><ul class="ab-bars">${ACC.map(([m, a, e, c]) =>
      `<li><span class="ab-bar-l">${m}</span><span class="ab-bar"><span style="width:${(a * 100).toFixed(1)}%"></span></span><span class="ab-bar-v">${e ? `${a} ± ${e}` : c}</span><span class="ab-bar-c">${e ? c : ""}</span></li>`).join("")}</ul>`;
  };
  const showCost = () => {
    const max = Math.log10(COST[1][2]);
    res.innerHTML = `<p class="ab-k">Circuit cost at 16×16 (log scale)</p><ul class="ab-bars">${COST.map(([m, d, g, q]) =>
      `<li><span class="ab-bar-l">${m}</span><span class="ab-bar"><span style="width:${(Math.log10(g) / max * 100).toFixed(1)}%"></span></span><span class="ab-bar-v">${g.toLocaleString("en")} gates</span><span class="ab-bar-c">depth ${d.toLocaleString("en")} · ${q} qubits</span></li>`).join("")}</ul>`;
  };
  buttons(ui.controls, [["Accuracy", showAcc, "acc"], ["Circuit cost", showCost, "cost"]], { group: "Results to show", pressed: "acc" });
  const out = document.createElement("p");
  out.className = "ab-readout";
  ui.controls.append(out);

  function draw() {
    const norm = Math.hypot(...px) || 1;
    px.forEach((v, i) => {
      tiles[i].setAttribute("fill", `rgb(${Math.round(255 * v)},${Math.round(255 * v)},${Math.round(255 * v)})`);
      tiles[i].setAttribute("aria-label", `Pixel ${i + 1}, brightness ${v.toFixed(2)}. Press to change.`);
      const a = v / norm, h = a * 150;
      bars[i][0].setAttribute("y", 190 - h); bars[i][0].setAttribute("height", h);
      bars[i][1].setAttribute("y", 182 - h); bars[i][1].textContent = fmt(a, 2);
    });
    out.innerHTML = `|ψ⟩ = ${px.map((v, i) => `${fmt(v / norm, 2)}|${i >> 1}${i & 1}⟩`).join(" + ")}`;
    ui.live.textContent = `Pixels ${px.map((v) => v.toFixed(2)).join(", ")} encode to amplitudes ${px.map((v) => fmt(v / norm, 2)).join(", ")}.`;
  }
  draw(); showAcc();
  return {};
}
