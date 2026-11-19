/* ANN-enhanced detection of multipartite entanglement (three-qubit NMR).
   Pick a textbook three-qubit state, one per SLOCC class; the 8×8 density matrix is computed live (real and
   imaginary parts), and the feature budget of the paper is shown: 64 complex elements → 128 real features →
   18 in canonical form → 4 (GME test) or 6 (SLOCC class) after ANOVA ranking. The class shown is the known
   ground truth of the chosen state, not a network prediction. */
import { shell, svg, el, buttons, slider, fmt } from "./ui.js";

const r2 = Math.SQRT1_2, r3 = 1 / Math.sqrt(3);
// Amplitudes over |q1 q2 q3⟩, index = 4·q1 + 2·q2 + q3. phi adds a relative phase to the last term.
const STATES = {
  sep: { name: "|000⟩", cls: "Fully separable", gme: false, amp: (p) => [[1, 0], 0, 0, 0, 0, 0, 0, 0] },
  b1: { name: "(|000⟩ + e^{iφ}|011⟩)/√2", cls: "Biseparable (qubit 1 | qubits 2–3)", gme: false, amp: (p) => [r2, 0, 0, [r2 * Math.cos(p), r2 * Math.sin(p)], 0, 0, 0, 0] },
  b3: { name: "(|000⟩ + e^{iφ}|110⟩)/√2", cls: "Biseparable (qubit 3 | qubits 1–2)", gme: false, amp: (p) => [r2, 0, 0, 0, 0, 0, [r2 * Math.cos(p), r2 * Math.sin(p)], 0] },
  b2: { name: "(|000⟩ + e^{iφ}|101⟩)/√2", cls: "Biseparable (qubit 2 | qubits 1–3)", gme: false, amp: (p) => [r2, 0, 0, 0, 0, [r2 * Math.cos(p), r2 * Math.sin(p)], 0, 0] },
  w: { name: "W = (|001⟩ + |010⟩ + e^{iφ}|100⟩)/√3", cls: "W class (genuinely entangled)", gme: true, amp: (p) => [0, r3, r3, 0, [r3 * Math.cos(p), r3 * Math.sin(p)], 0, 0, 0] },
  ghz: { name: "GHZ = (|000⟩ + e^{iφ}|111⟩)/√2", cls: "GHZ class (genuinely entangled)", gme: true, amp: (p) => [r2, 0, 0, 0, 0, 0, 0, [r2 * Math.cos(p), r2 * Math.sin(p)]] },
};
const cplx = (a) => (Array.isArray(a) ? a : [a, 0]);

export function mount(host) {
  const ui = shell(host, {
    title: "What the network sees",
    lede: "Choose a three-qubit state. Its density matrix ρ is what the measured data describe; the network reads a few of its numbers and names the kind of entanglement.",
    note: "States and matrices are textbook examples computed in your browser. Feature counts and accuracies are from the paper: on 30 experimental NMR states, GME detection 0.954 ± 0.046 with 4 features and SLOCC classification 0.867 ± 0.090 with 6.",
  });
  const N = 8, cell = 30, ox = 52, oy = 34;
  const s = svg(320, 300, "8 by 8 density matrix heat map");
  s.classList.add("ab-matrix");
  const labels = ["000", "001", "010", "011", "100", "101", "110", "111"];
  labels.forEach((l, i) => {
    el(s, "text", { x: ox + i * cell + cell / 2, y: oy - 8, "text-anchor": "middle", class: "fg-s", "font-size": 10 }, l);
    el(s, "text", { x: ox - 6, y: oy + i * cell + cell / 2 + 4, "text-anchor": "end", class: "fg-s", "font-size": 10 }, l);
  });
  const cells = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    el(s, "rect", { x: ox + j * cell, y: oy + i * cell, width: cell - 1, height: cell - 1, class: "fg-box" });
    cells.push(el(s, "rect", { x: ox + j * cell + 3, y: oy + i * cell + 3, width: cell - 7, height: cell - 7, rx: 2, class: "fg-fill", opacity: 0 }));
  }
  ui.fig.append(s);

  const funnel = document.createElement("ol");
  funnel.className = "ab-funnel";
  funnel.innerHTML = [["64", "complex elements of ρ"], ["128", "real features (Re and Im)"], ["18", "left in canonical form (14 Re, 4 Im)"], ["4 / 6", "ranked by ANOVA: GME test / SLOCC class"]]
    .map(([n, t], i) => `<li style="--w:${[100, 100, 34, 14][i]}%"><span class="ab-funnel-n">${n}</span> ${t}</li>`).join("");
  ui.fig.append(funnel);

  let key = "ghz", part = "re", phi = 0;
  const verdict = document.createElement("p");
  verdict.className = "ab-readout";
  const draw = () => {
    const st = STATES[key], a = st.amp(phi).map(cplx);
    let maxv = 0;
    const vals = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      // ρ_ij = a_i · conj(a_j)
      const re = a[i][0] * a[j][0] + a[i][1] * a[j][1], im = a[i][1] * a[j][0] - a[i][0] * a[j][1];
      const v = part === "re" ? re : im;
      vals.push(v); maxv = Math.max(maxv, Math.abs(v));
    }
    vals.forEach((v, k) => {
      const c = cells[k], m = maxv ? Math.abs(v) / maxv : 0;
      c.setAttribute("opacity", (m * 0.9).toFixed(3));
      c.setAttribute("class", v < 0 ? "fg-neg" : "fg-fill");
    });
    const nz = vals.filter((v) => Math.abs(v) > 1e-9).length;
    verdict.innerHTML = `<span class="ab-k">State</span> ${st.name}<br><span class="ab-k">Known class</span> <strong>${st.cls}</strong>${st.gme ? " · GME" : ""}`;
    ui.live.textContent = `${st.name}. Showing the ${part === "re" ? "real" : "imaginary"} part of ρ: ${nz} non-zero of 64 elements, largest magnitude ${fmt(maxv, 3)}. Known class: ${st.cls}.`;
  };
  buttons(ui.controls, [["Separable", () => { key = "sep"; draw(); }, "sep"], ["Biseparable 1|23", () => { key = "b1"; draw(); }, "b1"],
    ["Biseparable 2|13", () => { key = "b2"; draw(); }, "b2"], ["Biseparable 3|12", () => { key = "b3"; draw(); }, "b3"],
    ["W", () => { key = "w"; draw(); }, "w"], ["GHZ", () => { key = "ghz"; draw(); }, "ghz"]], { group: "Three-qubit state", pressed: "ghz" });
  buttons(ui.controls, [["Re ρ", () => { part = "re"; draw(); }, "re"], ["Im ρ", () => { part = "im"; draw(); }, "im"]], { group: "Part of the density matrix", pressed: "re" });
  slider(ui.controls, { label: "Relative phase φ", min: 0, max: 6.28, step: 0.01, value: 0, fmt: (v) => `${v.toFixed(2)} rad`, onInput: (v) => { phi = v; draw(); } });
  ui.controls.append(verdict);
  draw();
  return {};
}
