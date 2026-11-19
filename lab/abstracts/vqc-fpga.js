/* Hybrid VQC weather forecasting with FPGA inference.
   Step through the pipeline as described in the paper (7 qubits, angle encoding, two StronglyEntanglingLayers,
   expectation-value readout, frozen model on an Alveo U55C FPGA kernel that exchanges data with the host over HBM),
   and tweak one encoded feature to see what angle encoding does to a single qubit (textbook maths). */
import { shell, svg, el, slider, stepper, fmt } from "./ui.js";

const Q = 7;
const STEPS = [
  ["Encode", "Each input feature becomes a rotation angle on one of the 7 qubits (angle encoding)."],
  ["Entangle", "Two StronglyEntanglingLayers rotate every qubit and link neighbours with CNOTs. Their 50 trainable parameters are what training adjusts."],
  ["Measure", "Expectation values of the qubits are read out and mapped to the temperature forecast."],
  ["Train", "In PennyLane on a CPU-based simulator, the 50 parameters were tuned on NCMRWF reanalysis data (test RMSE 3.01 K, R² 0.801)."],
  ["Deploy", "The trained circuit is frozen and runs as a custom Vitis HLS kernel on an AMD Alveo U55C FPGA, which exchanges batches of inputs, weights and expectation values with the host over HBM."],
];

export function mount(host, { reduce }) {
  const ui = shell(host, {
    title: "From weather data to an FPGA forecast",
    lede: "Step through the pipeline, then move the slider to encode one feature into qubit 1.",
    note: "Stages and numbers as reported in the paper. The single-qubit readout is the textbook result of a Y-rotation by the encoded angle, shown for intuition; it is not the paper's data.",
  });
  const W = 640, H = 330, top = 40, gap = 34, x0 = 70;
  const s = svg(W, H, "Circuit: 7 qubit wires, encoding gates, two entangling layers, measurements, and an FPGA box around the trained part");
  const wireY = (q) => top + q * gap;
  const g = { enc: el(s, "g"), sel: el(s, "g"), meas: el(s, "g"), fpga: el(s, "g") };
  for (let q = 0; q < Q; q++) {
    el(s, "line", { x1: 40, x2: 600, y1: wireY(q), y2: wireY(q), class: "fg-faint" });
    el(s, "text", { x: 12, y: wireY(q) + 5, class: "fg-s" }, `q${q + 1}`);
    el(g.enc, "rect", { x: x0 - 6, y: wireY(q) - 12, width: 66, height: 24, rx: 3, class: "fg-box" });
    el(g.enc, "text", { x: x0 + 27, y: wireY(q) + 5, "text-anchor": "middle", class: "fg-s", "font-size": 13 }, `RY(x${q + 1})`);
  }
  for (let L = 0; L < 2; L++) {
    const xL = 200 + L * 150;
    el(g.sel, "rect", { x: xL, y: top - 18, width: 110, height: (Q - 1) * gap + 36, rx: 6, class: "fg-hbox" });
    el(g.sel, "text", { x: xL + 55, y: top - 24, "text-anchor": "middle", class: "fg-s" }, `Layer ${L + 1}`);
    for (let q = 0; q < Q; q++) {
      const cx = xL + 22 + (q % 3) * 30, t = (q + 1 + L) % Q;
      el(g.sel, "line", { x1: cx, x2: cx, y1: wireY(q), y2: wireY(t), class: "fg-hue", opacity: 0.55 });
      el(g.sel, "circle", { cx, cy: wireY(q), r: 3.5, class: "fg-fill" });
      el(g.sel, "circle", { cx, cy: wireY(t), r: 7, class: "fg-hue" });
    }
  }
  for (let q = 0; q < Q; q++) {
    el(g.meas, "rect", { x: 520, y: wireY(q) - 12, width: 30, height: 24, rx: 3, class: "fg-box" });
    el(g.meas, "path", { d: `M${525} ${wireY(q) + 6} a10 10 0 0 1 20 0 M535 ${wireY(q) + 6} l7 -10`, class: "fg-ln" });
  }
  el(g.fpga, "rect", { x: 190, y: 8, width: 372, height: H - 22, rx: 10, class: "fg-faint", "stroke-dasharray": "6 5" });
  el(g.fpga, "text", { x: 376, y: H - 20, "text-anchor": "middle", class: "fg-s" }, "frozen on FPGA · Alveo U55C · host ⇄ HBM");
  ui.fig.append(s);

  const card = document.createElement("p");
  card.className = "ab-readout";
  const note = document.createElement("p");
  note.className = "ab-stepnote";
  const groups = [g.enc, g.sel, g.meas, g.sel, g.fpga];
  const st = stepper(ui.controls, STEPS.length, (k) => {
    Object.values(g).forEach((n) => n.setAttribute("opacity", "0.28"));
    groups[k].setAttribute("opacity", "1");
    if (k === 3) g.enc.setAttribute("opacity", "1");
    if (k === 4) { g.sel.setAttribute("opacity", "1"); g.meas.setAttribute("opacity", "1"); }
    ui.live.textContent = `${STEPS[k][0]}: ${STEPS[k][1]}`;
    note.innerHTML = `<strong>${STEPS[k][0]}.</strong> ${STEPS[k][1]}`;
  }, { reduce });
  ui.controls.append(note);

  const qubit = svg(150, 150, "Qubit 1 on a circle: the state rotates as the encoded feature changes");
  el(qubit, "circle", { cx: 75, cy: 75, r: 58, class: "fg-faint" });
  el(qubit, "text", { x: 75, y: 12, "text-anchor": "middle", class: "fg-s" }, "|0⟩");
  el(qubit, "text", { x: 75, y: 148, "text-anchor": "middle", class: "fg-s" }, "|1⟩");
  const arrow = el(qubit, "line", { x1: 75, y1: 75, x2: 75, y2: 17, class: "fg-hue" });
  const dot = el(qubit, "circle", { cx: 75, cy: 17, r: 5, class: "fg-fill" });
  const mini = document.createElement("div");
  mini.className = "ab-mini";
  mini.append(qubit, card);
  ui.controls.append(mini);
  slider(ui.controls, {
    label: "Encoded angle on qubit 1 (θ, radians)", min: 0, max: Math.PI, step: 0.01, value: 0.9, fmt: (v) => v.toFixed(2),
    onInput: (th) => {
      const x = 75 + 58 * Math.sin(th), y = 75 - 58 * Math.cos(th);
      arrow.setAttribute("x2", x); arrow.setAttribute("y2", y); dot.setAttribute("cx", x); dot.setAttribute("cy", y);
      card.innerHTML = `RY(θ)|0⟩ = ${fmt(Math.cos(th / 2), 2)}|0⟩ + ${fmt(Math.sin(th / 2), 2)}|1⟩<br>⟨Z⟩ = cos θ = <strong>${fmt(Math.cos(th), 2)}</strong>`;
    },
  }).set(0.9);
  return { pause: st.pause, resume: st.resume };
}
