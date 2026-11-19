/* Bitter solenoid: why the cooling matters. Textbook scaling only, in relative units (1 = a reference setting):
   with fixed geometry and resistance, the field B0 is proportional to the current I, the Joule heating P to I squared,
   and the bulk temperature rise of the coolant to P divided by the coolant flow Q. The real resistance rises with
   temperature; that is ignored here. The project's own design values are in the write-up, not in this toy. */
import { shell, svg, el, slider, fmt } from "./ui.js";

export function mount(host, { reduce }) {
  const ui = shell(host, {
    title: "Field, heat and water",
    lede: "Change the current and the coolant flow. The field follows the current; the heat follows its square.",
    note: "Relative units, with fixed geometry and resistance (the 1.0 mark is a reference setting). It shows the scaling, not the simulator's results.",
  });
  const s = svg(640, 250, "Left: a cross-section of the plate stack with moving water arrows. Right: bars for field, heating and coolant temperature rise relative to a reference");
  const plates = [[40, 110], [210, 280]], holes = [];
  plates.forEach(([a, b]) => {
    const heat = el(s, "rect", { x: a, y: 30, width: b - a, height: 190, rx: 3, class: "fg-fill", opacity: 0 });
    el(s, "rect", { x: a, y: 30, width: b - a, height: 190, rx: 3, class: "fg-box", "fill-opacity": 0 });
    for (const f of [0.33, 0.66]) holes.push(el(s, "line", { x1: a + (b - a) * f, x2: a + (b - a) * f, y1: 38, y2: 212, class: "fg-hue", "stroke-width": 3, "stroke-dasharray": "10 10" }));
    heat.dataset.heat = "1";
  });
  const hot = [...s.querySelectorAll("[data-heat]")];
  el(s, "line", { x1: 160, x2: 160, y1: 30, y2: 220, class: "fg-faint", "stroke-dasharray": "5 5" });
  const bz = el(s, "text", { x: 168, y: 130, class: "fg-s" }, "B₀");
  el(s, "text", { x: 160, y: 240, class: "fg-s", "text-anchor": "middle" }, "bore");
  const names = ["field B₀ ∝ I", "heat P ∝ I²", "coolant ΔT ∝ I²/Q"], X0 = 440, bw = 150, max = 4.5, bars = [];
  names.forEach((n, i) => {
    const y = 50 + i * 62;
    el(s, "text", { x: 330, y: y - 8, class: "fg-s" }, n);
    el(s, "rect", { x: 330, y, width: 280, height: 18, class: "fg-box" });
    bars.push(el(s, "rect", { x: 330, y, height: 18, class: "fg-fill", width: 0 }));
  });
  el(s, "line", { x1: 330 + 280 / max, x2: 330 + 280 / max, y1: 40, y2: 226, class: "fg-faint", "stroke-dasharray": "3 4" });
  el(s, "text", { x: 330 + 280 / max, y: 240, class: "fg-s", "text-anchor": "middle" }, "1.0");
  ui.fig.append(s);
  const out = document.createElement("p");
  out.className = "ab-readout";
  let I = 1, Q = 1, off = 0, raf = null, last = 0;
  const draw = () => {
    const v = [I, I * I, (I * I) / Q];
    v.forEach((x, i) => bars[i].setAttribute("width", Math.min(280, (280 * x) / max)));
    hot.forEach((h) => h.setAttribute("opacity", Math.min(0.55, 0.12 * v[2])));
    out.innerHTML = `field ×<strong>${fmt(v[0], 2)}</strong> · heat ×<strong>${fmt(v[1], 2)}</strong> · coolant temperature rise ×<strong>${fmt(v[2], 2)}</strong>`;
    ui.live.textContent = `Current ${fmt(I, 2)}, flow ${fmt(Q, 2)}: field ${fmt(v[0], 2)} times the reference, heat ${fmt(v[1], 2)} times, coolant temperature rise ${fmt(v[2], 2)} times.`;
    holes.forEach((h) => h.setAttribute("stroke-dashoffset", String(-off)));
  };
  slider(ui.controls, { label: "Current I (× reference)", min: 0.5, max: 1.5, step: 0.05, value: 1, fmt: (x) => x.toFixed(2), onInput: (x) => { I = x; draw(); } });
  slider(ui.controls, { label: "Coolant flow Q (× reference)", min: 0.5, max: 2, step: 0.05, value: 1, fmt: (x) => x.toFixed(2), onInput: (x) => { Q = x; draw(); } });
  ui.controls.append(out);
  const tick = (t) => { off = (off + ((t - last) / 1000) * 30 * Q) % 20; last = t; draw(); raf = requestAnimationFrame(tick); };
  const resume = () => { if (reduce || raf) return; last = performance.now(); raf = requestAnimationFrame(tick); };
  const pause = () => { if (raf) cancelAnimationFrame(raf); raf = null; };
  draw();
  resume();
  return { pause, resume };
}
