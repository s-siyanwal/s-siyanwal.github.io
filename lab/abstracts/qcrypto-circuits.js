/* Quantum circuits for block ciphers: Grover key search.
   A toy search over 16 possible keys (4 bits). The oracle flips the sign of the amplitude of the secret key (in the
   project, the oracle is the cipher circuit run on a known plaintext and compared with the ciphertext); the
   diffusion step reflects all amplitudes about their mean. About (π/4)·√16 ≈ 3 rounds make the key the most
   likely outcome, versus up to 16 guesses classically. Exact state-vector maths, computed live. */
import { shell, svg, el, buttons, fmt } from "./ui.js";

const N = 16;

export function mount(host, { reduce }) {
  const ui = shell(host, {
    title: "Grover search for a secret key",
    lede: "Pick the secret key, then apply the oracle and diffusion steps, or let it run.",
    note: "A 16-key toy computed exactly in your browser. The project built the full circuits for an 8-bit Mini-AES / S-AES, including the S-box's Galois-field arithmetic, ran them with Qiskit and on IBM Quantum hardware, and used Grover search on the scaled-down cipher.",
  });
  let key = 11, amp = [], rounds = 0, timer = null, phase = 0;
  const s = svg(640, 250, "Amplitudes of the 16 candidate keys; the secret key's bar is highlighted");
  const base = 140, scale = 120;
  el(s, "line", { x1: 20, x2: 620, y1: base, y2: base, class: "fg-faint" });
  const mean = el(s, "line", { x1: 20, x2: 620, class: "fg-faint", "stroke-dasharray": "4 4" });
  const meanT = el(s, "text", { x: 624, class: "fg-s", "text-anchor": "end" }, "mean");
  const bars = [...Array(N).keys()].map((k) => {
    const x = 28 + k * 37;
    const r = el(s, "rect", { x, width: 26, class: "fg-fill" });
    const t = el(s, "text", { x: x + 13, y: 240, "text-anchor": "middle", class: "fg-s", "font-size": 11 }, k.toString(2).padStart(4, "0"));
    return [r, t];
  });
  ui.fig.append(s);
  const out = document.createElement("p");
  out.className = "ab-readout";

  const reset = () => { amp = Array(N).fill(1 / Math.sqrt(N)); rounds = 0; phase = 0; draw("Uniform superposition: every key equally likely."); };
  const oracle = () => { amp[key] = -amp[key]; phase = 1; draw("Oracle: the secret key's amplitude is flipped."); };
  const diffuse = () => { const m = amp.reduce((a, b) => a + b, 0) / N; amp = amp.map((a) => 2 * m - a); rounds += 1; phase = 0; draw("Diffusion: every amplitude is reflected about the mean."); };
  const step = () => (phase === 0 ? oracle() : diffuse());
  function draw(msg) {
    const m = amp.reduce((a, b) => a + b, 0) / N;
    mean.setAttribute("y1", base - m * scale); mean.setAttribute("y2", base - m * scale); meanT.setAttribute("y", base - m * scale - 4);
    amp.forEach((a, k) => {
      const [r, t] = bars[k], h = a * scale;
      r.setAttribute("y", h >= 0 ? base - h : base); r.setAttribute("height", Math.abs(h));
      r.setAttribute("class", k === key ? "fg-fill" : "fg-bar");
      t.setAttribute("font-weight", k === key ? "700" : "400");
    });
    const p = amp[key] ** 2;
    out.innerHTML = `Rounds: <strong>${rounds}</strong> · probability of measuring the key: <strong>${fmt(p * 100, 1)}%</strong> (best after 3 rounds)`;
    ui.live.textContent = `${msg} After ${rounds} rounds the key ${key.toString(2).padStart(4, "0")} is measured with probability ${fmt(p * 100, 1)} percent.`;
  }
  const stop = () => { clearInterval(timer); timer = null; };
  const keySel = document.createElement("label");
  keySel.className = "ab-select";
  keySel.innerHTML = `Secret key <select>${[...Array(N).keys()].map((k) => `<option value="${k}"${k === key ? " selected" : ""}>${k.toString(2).padStart(4, "0")}</option>`).join("")}</select>`;
  keySel.querySelector("select").addEventListener("change", (e) => { key = +e.target.value; stop(); reset(); });
  ui.controls.append(keySel);
  buttons(ui.controls, [["Oracle", () => { stop(); if (phase === 0) oracle(); }], ["Diffusion", () => { stop(); if (phase === 1) diffuse(); }],
    ["Run 3 rounds", () => { stop(); reset(); if (reduce) { for (let i = 0; i < 6; i++) step(); return; } timer = setInterval(() => { step(); if (rounds >= 3) stop(); }, 700); }],
    ["Reset", () => { stop(); reset(); }]]);
  ui.controls.append(out);
  reset();
  return { pause: stop, resume: () => {} };
}
