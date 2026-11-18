/* Linear-optical QKD testbeds: differential-phase-shift (DPS) QKD, one of the three protocols simulated.
   Alice sends a train of weak pulses, each with phase 0 or π. Bob's delay-line interferometer compares each pulse
   with the next: equal phases send the photon to detector D0 (bit 0), opposite phases to D1 (bit 1).
   An intercept-resend attacker who measures and re-sends the light breaks the phase relation between the blocks
   she re-sends, so at those boundaries Bob's detector clicks at random: the errors that reveal her.
   Qualitative and noise-free; the project's OptiSystem / ANSYS testbeds model loss, noise and detector effects. */
import { shell, svg, el, buttons } from "./ui.js";

const P = 10;

export function mount(host) {
  const ui = shell(host, {
    title: "Phases, interference and an eavesdropper",
    lede: "Click pulses to switch their phase between 0 and π. Then let an attacker intercept and re-send the light.",
    note: "A noise-free sketch of the DPS principle, computed in your browser. The project also simulated COW and Twin-Field QKD, and modelled photon-number-splitting attacks, over channels with loss and detector noise.",
  });
  let phase = [0, 1, 1, 0, 1, 0, 0, 0, 1, 1], eve = false, seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let coin = [];
  const s = svg(640, 250, "Ten pulses with phases, and the detector that clicks for each neighbouring pair", { interactive: true });
  el(s, "text", { x: 10, y: 28, class: "fg-s" }, "Alice's pulses");
  el(s, "text", { x: 10, y: 150, class: "fg-s" }, "Bob's clicks");
  const xs = (k) => 40 + k * 60;
  const pulses = phase.map((_, k) => {
    const g = el(s, "g", { tabindex: 0, role: "button", class: "ab-pulse" });
    const c = el(g, "circle", { cx: xs(k), cy: 70, r: 18, class: "fg-hbox" });
    const t = el(g, "text", { x: xs(k), y: 75, "text-anchor": "middle", class: "fg-t" }, "");
    const flip = () => { phase[k] ^= 1; draw(); };
    g.addEventListener("click", flip);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
    return [g, c, t];
  });
  const blocks = el(s, "g");
  const clicks = phase.slice(1).map((_, k) => {
    const x = (xs(k) + xs(k + 1)) / 2;
    el(s, "path", { d: `M${xs(k)} 92 Q${x} 115 ${xs(k + 1)} 92`, class: "fg-faint" });
    return [el(s, "rect", { x: x - 20, y: 160, width: 40, height: 28, rx: 4, class: "fg-box" }), el(s, "text", { x, y: 179, "text-anchor": "middle", class: "fg-t" }, ""),
      el(s, "text", { x, y: 210, "text-anchor": "middle", class: "fg-s" }, "")];
  });
  ui.fig.append(s);
  const out = document.createElement("p");
  out.className = "ab-readout";

  function draw() {
    blocks.innerHTML = "";
    if (eve) for (let k = 0; k < P; k += 2) el(blocks, "rect", { x: xs(k) - 26, y: 42, width: 112, height: 56, rx: 10, class: "fg-faint", "stroke-dasharray": "5 4" });
    let errors = 0;
    pulses.forEach(([g, c, t], k) => { t.textContent = phase[k] ? "π" : "0"; g.setAttribute("aria-label", `${phase[k] ? "π" : "0"}: phase of pulse ${k + 1}. Press to switch.`); });
    clicks.forEach(([box, t, lab], k) => {
      const ideal = phase[k] ^ phase[k + 1];                       // 0 → D0, 1 → D1
      const broken = eve && k % 2 === 1;                           // pair spans two re-sent blocks
      const bit = broken ? coin[k] : ideal;
      const err = bit !== ideal;
      if (err) errors += 1;
      t.textContent = `D${bit}`;
      box.setAttribute("class", err ? "fg-hbox" : "fg-box");
      lab.textContent = broken ? (err ? "error" : "random") : `bit ${bit}`;
    });
    const n = clicks.length;
    out.innerHTML = eve
      ? `Attacker on: ${Math.floor(n / 2)} of ${n} neighbouring pairs straddle her re-sent blocks and click at random · errors this run: <strong>${errors}</strong>`
      : `No attacker: every click matches the phase difference · errors: <strong>0</strong>`;
    ui.live.textContent = `Phases ${phase.map((p) => (p ? "pi" : "0")).join(", ")}. ${eve ? `With an intercept-resend attacker, ${errors} errors appear.` : "No attacker, no errors."}`;
  }
  buttons(ui.controls, [["No attacker", () => { eve = false; draw(); }, "off"], ["Intercept-resend attacker", () => {
    eve = true; coin = phase.map(() => (rnd() < 0.5 ? 0 : 1)); draw();
  }, "on"]], { group: "Channel", pressed: "off" });
  buttons(ui.controls, [["New attacker run", () => { if (eve) { coin = phase.map(() => (rnd() < 0.5 ? 0 : 1)); draw(); } }]]);
  ui.controls.append(out);
  draw();
  return {};
}
