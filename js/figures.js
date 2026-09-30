/* Schematic figures for project pages (DESIGN.md §6). Hand-built SVG, 640×360.
   Colours are ink, ink-faint and the thread hue only; no numbers that aren't in content, except the image data figure (§6). */

const box = (x, y, w, h, label, cls = "fg-box") =>
  `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>` +
  (Array.isArray(label) ? label : [label]).map((t, i, a) =>
    `<text class="fg-t" x="${x + w / 2}" y="${y + h / 2 + 6 + (i - (a.length - 1) / 2) * 20}" text-anchor="middle">${t}</text>`).join("");

/* Straight arrow with a filled head; ends 2px short of the target. */
function arrow(x1, y1, x2, y2, cls = "fg-faint") {
  const a = Math.atan2(y2 - y1, x2 - x1), ex = x2 - 2 * Math.cos(a), ey = y2 - 2 * Math.sin(a);
  const hx = (d, s) => (ex - 10 * Math.cos(a) + s * d * Math.sin(a)).toFixed(1);
  const hy = (d, s) => (ey - 10 * Math.sin(a) - s * d * Math.cos(a)).toFixed(1);
  return `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${(ex - 8 * Math.cos(a)).toFixed(1)}" y2="${(ey - 8 * Math.sin(a)).toFixed(1)}"/>` +
    `<path class="fg-arrow" d="M${ex.toFixed(1)} ${ey.toFixed(1)}L${hx(5, 1)} ${hy(5, 1)}L${hx(5, -1)} ${hy(5, -1)}Z"/>`;
}

function nmr() {
  // SLOCC hierarchy, arrows point down (GHZ → W → BS1–3 → SEP); pipeline on the right (canonical form reduces, ANOVA only ranks).
  const G = [210, 10], W = [210, 92], B = [90, 210, 330], BY = 176, S = [210, 262], H = 34;
  const hier = arrow(G[0], G[1] + H, W[0], W[1]) +
    B.map((x) => arrow(W[0], W[1] + H, x, BY)).join("") +
    B.map((x) => arrow(x, BY + H, S[0], S[1])).join("");
  const steps = [[8, 72, ["ρ: 64 elements", "128 real features", "(Re + Im)"]], [104, 56, ["canonical form", "18 (14 Re, 4 Im)"]],
    [184, 40, "ANOVA ranking"], [248, 40, "ANN", "fg-hbox"], [312, 40, "class label"]];
  const pipe = steps.map(([y, h, t, cls], i) => box(430, y, 200, h, t, cls) +
    (i < steps.length - 1 ? arrow(530, y + h, 530, steps[i + 1][0]) : "")).join("");
  return hier +
    box(G[0] - 40, G[1], 80, H, "GHZ", "fg-hbox") + box(W[0] - 40, W[1], 80, H, "W", "fg-hbox") +
    B.map((x, i) => box(x - 38, BY, 76, H, `BS${i + 1}`)).join("") +
    box(S[0] - 40, S[1], 80, H, "SEP") + pipe;
}

function weather() {
  const n = 80, x0 = 70, x1 = 590, pt = (f) => Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    return `${i ? "L" : "M"}${(x0 + u * (x1 - x0)).toFixed(1)} ${f(u).toFixed(1)}`;
  }).join("");
  const obs = (u) => 205 - 55 * Math.sin(2 * Math.PI * 1.6 * u) - 16 * Math.sin(2 * Math.PI * 5.3 * u + 1);
  const base = (u) => 205 - 42 * Math.sin(2 * Math.PI * 1.6 * u - .55);
  const vqc = (u) => obs(u) + 7 * Math.sin(2 * Math.PI * 7 * u + .4);
  const legend = [["fg-ln", "observed", ""], ["fg-faint", "classical baseline", ' stroke-dasharray="6 5"'], ["fg-hue", "variational circuit", ""]]
    .map(([c, t, d], i) => `<line class="${c}"${d} x1="400" y1="${34 + i * 24}" x2="432" y2="${34 + i * 24}"/><text class="fg-s" x="442" y="${39 + i * 24}">${t}</text>`).join("");
  return arrow(56, 320, 620, 320, "fg-ln") + arrow(56, 320, 56, 24, "fg-ln") +
    `<text class="fg-s" x="612" y="346" text-anchor="end">time</text>` +
    `<text class="fg-s" transform="translate(40 320) rotate(-90)">temperature</text>` +
    `<path class="fg-faint" stroke-dasharray="6 5" d="${pt(base)}"/>` +
    `<path class="fg-ln" d="${pt(obs)}"/>` +
    `<path class="fg-hue" d="${pt(vqc)}"/>` + legend;
}

/* Data figure from Tables 1–2 of the J. Supercomputing paper (art/assets/figure-image-encodings.svg, DESIGN.md §6). */
const image = () => `<line x1="80" y1="300.0" x2="600" y2="300.0" stroke="var(--rule,#c9d3cf)" stroke-width="1"/>
<text x="70" y="305.0" text-anchor="end" font-size="15" fill="var(--ink-faint,#4d5b57)">10<tspan dy="-7" font-size="14">3</tspan></text>
<line x1="80" y1="196.0" x2="600" y2="196.0" stroke="var(--rule,#c9d3cf)" stroke-width="1"/>
<text x="70" y="201.0" text-anchor="end" font-size="15" fill="var(--ink-faint,#4d5b57)">10<tspan dy="-7" font-size="14">4</tspan></text>
<line x1="80" y1="92.0" x2="600" y2="92.0" stroke="var(--rule,#c9d3cf)" stroke-width="1"/>
<text x="70" y="97.0" text-anchor="end" font-size="15" fill="var(--ink-faint,#4d5b57)">10<tspan dy="-7" font-size="14">5</tspan></text>
<text x="80.0" y="322" text-anchor="middle" font-size="15" fill="var(--ink-faint,#4d5b57)">8</text>
<text x="184.0" y="322" text-anchor="middle" font-size="15" fill="var(--ink-faint,#4d5b57)">10</text>
<text x="288.0" y="322" text-anchor="middle" font-size="15" fill="var(--ink-faint,#4d5b57)">12</text>
<text x="392.0" y="322" text-anchor="middle" font-size="15" fill="var(--ink-faint,#4d5b57)">14</text>
<text x="496.0" y="322" text-anchor="middle" font-size="15" fill="var(--ink-faint,#4d5b57)">16</text>
<text x="600.0" y="322" text-anchor="middle" font-size="15" fill="var(--ink-faint,#4d5b57)">18</text>
<path d="M80 300H600M80 300V32" stroke="var(--ink,#12201f)" stroke-width="1.5" fill="none"/>
<text x="340" y="350" text-anchor="middle" font-size="16" fill="var(--ink,#12201f)">Qubit count</text>
<text transform="translate(22 166) rotate(-90)" text-anchor="middle" font-size="16" fill="var(--ink,#12201f)">Circuit depth (log scale)</text>
<text x="596" y="24" text-anchor="end" font-size="14" fill="var(--ink-faint,#4d5b57)">16×16 images</text>
<circle cx="496.0" cy="222.1" r="7" fill="var(--th-image)"/>
<text x="484.0" y="218.1" text-anchor="end" font-size="16" font-weight="600" fill="var(--ink,#12201f)">QBIR</text>
<text x="484.0" y="236.1" text-anchor="end" font-size="14" fill="var(--ink-faint,#4d5b57)">16 qubits · depth 5,612</text>
<circle cx="288.0" cy="129.8" r="7" fill="var(--th-image)"/>
<text x="300.0" y="125.8" text-anchor="start" font-size="16" font-weight="600" fill="var(--ink,#12201f)">FTQR</text>
<text x="300.0" y="143.8" text-anchor="start" font-size="14" fill="var(--ink-faint,#4d5b57)">12 qubits · depth 43,273</text>
<circle cx="132.0" cy="122.9" r="7" fill="var(--th-image)"/>
<text x="124.0" y="148.9" text-anchor="start" font-size="16" font-weight="600" fill="var(--ink,#12201f)">NASS</text>
<text x="124.0" y="166.9" text-anchor="start" font-size="14" fill="var(--ink-faint,#4d5b57)">9 qubits · depth 50,436</text>
<circle cx="236.0" cy="81.8" r="7" fill="var(--th-image)"/>
<text x="248.0" y="77.8" text-anchor="start" font-size="16" font-weight="600" fill="var(--ink,#12201f)">FRQCI</text>
<text x="248.0" y="95.8" text-anchor="start" font-size="14" fill="var(--ink-faint,#4d5b57)">11 qubits · depth 125,299</text>`;

const IMAGE_TABLE = `<details class="fig-data"><summary>Data (Tables 1–2)</summary>
  <table><caption>Circuit resources at 16×16</caption>
    <thead><tr><th scope="col">Encoding</th><th scope="col">Qubits</th><th scope="col">Depth</th><th scope="col">Total gates</th></tr></thead>
    <tbody>${[["QBIR", 16, "5,612", "9,701"], ["FTQR", 12, "43,273", "59,683"], ["NASS", 9, "50,436", "72,713"], ["FRQCI", 11, "125,299", "164,353"]]
      .map(([e, q, d, g]) => `<tr><th scope="row">${e}</th><td>${q}</td><td>${d}</td><td>${g}</td></tr>`).join("")}</tbody>
  </table></details>`;

/* Schematic from art/assets/figure-fpga.svg (DESIGN.md §6): VQC, FPGA kernel with HBM, edge inference. No numbers. */
const fpga = (uid) => `<g font-size="16"><defs><marker id="${uid}-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--ink-faint,#4d5b57)"/></marker></defs>
<g fill="none" stroke="var(--ink-faint,#4d5b57)" stroke-width="1.5">
<rect x="24" y="96" width="156" height="120" rx="4" stroke="var(--rule-strong,#6f7f7a)"/>
<path d="M44 128H160M44 156H160M44 184H160"/>
<path d="M184 156H240" marker-end="url(#${uid}-ah)"/><path d="M424 156H464" marker-end="url(#${uid}-ah)"/><path d="M332 206V250" marker-end="url(#${uid}-ah)"/>
<path d="M332 250V206" marker-end="url(#${uid}-ah)"/>
<rect x="468" y="116" width="148" height="80" rx="4" stroke="var(--rule-strong,#6f7f7a)"/>
<rect x="274" y="254" width="116" height="52" rx="4" stroke="var(--rule-strong,#6f7f7a)"/>
</g>
<g fill="var(--th,#94641c)">
<rect x="52" y="119" width="18" height="18" rx="2"/>
<rect x="52" y="147" width="18" height="18" rx="2"/>
<rect x="52" y="175" width="18" height="18" rx="2"/>
<path d="M92 128V156" stroke="var(--th,#94641c)" stroke-width="2"/><circle cx="92" cy="128" r="4"/><circle cx="92" cy="156" r="8" fill="none" stroke="var(--th,#94641c)" stroke-width="2"/><path d="M84 156H100M92 148V164" stroke="var(--th,#94641c)" stroke-width="2"/>
<path d="M118 156V184" stroke="var(--th,#94641c)" stroke-width="2"/><circle cx="118" cy="156" r="4"/><circle cx="118" cy="184" r="8" fill="none" stroke="var(--th,#94641c)" stroke-width="2"/><path d="M110 184H126M118 176V192" stroke="var(--th,#94641c)" stroke-width="2"/>
<path d="M144 184V128" stroke="var(--th,#94641c)" stroke-width="2"/><circle cx="144" cy="184" r="4"/><circle cx="144" cy="128" r="8" fill="none" stroke="var(--th,#94641c)" stroke-width="2"/><path d="M136 128H152M144 120V136" stroke="var(--th,#94641c)" stroke-width="2"/>
</g>
<rect x="244" y="116" width="176" height="80" rx="4" fill="none" stroke="var(--th,#94641c)" stroke-width="2.5"/>
<g fill="var(--ink,#12201f)" text-anchor="middle">
<text x="102" y="240">VQC</text>
<text x="332" y="152">FPGA kernel</text>
<text x="332" y="174" font-size="14" fill="var(--ink-faint,#4d5b57)">(HLS)</text>
<text x="332" y="286">HBM</text>
<text x="542" y="152">edge</text>
<text x="542" y="174">inference</text>
</g></g>`;

function qkd(uid) {
  const g = `${uid}-loss`;
  const fibre = (x1, x2, y, rev) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="url(#${g}${rev ? "r" : ""})" stroke-width="3"/>`;
  const fade = (x, a, b) => (1 - .7 * (x - a) / (b - a)).toFixed(2);
  const row = (y, label, mid) => `<text class="fg-s" x="20" y="${y + 5}">${label}</text>` + mid;
  const dps = [0, 1, 1, 0, 1, 0, 0].map((ph, i) => {
    const x = 222 + i * 44;
    return `<circle class="fg-fill" cx="${x}" cy="60" r="6" opacity="${fade(x, 200, 500)}"/><text class="fg-s" x="${x}" y="40" text-anchor="middle">${ph ? "π" : "0"}</text>`;
  }).join("");
  // Four time-slot pairs: (μ,0) and (0,μ) are bit values, (μ,μ) is a decoy; an empty slot is a dashed outline.
  const cow = [[1, 0], [0, 1], [1, 1], [1, 0]].map((pair, p) => {
    const c = 236 + p * 76;
    return `<path d="M${c - 24} 196v5h48v-5" fill="none" stroke="var(--ink-faint)" stroke-width="1" opacity=".6"/>` +
      pair.map((on, k) => {
        const x = c + (k ? 13 : -13);
        return on ? `<circle class="fg-fill" cx="${x}" cy="180" r="6" opacity="${fade(x, 200, 500)}"/>`
          : `<circle cx="${x}" cy="180" r="6" fill="none" stroke="var(--ink-faint)" stroke-dasharray="2 2"/>`;
      }).join("");
  }).join("");
  const tf = [230, 270].map((x) => `<circle class="fg-fill" cx="${x}" cy="300" r="6" opacity="${fade(x, 180, 330)}"/>`).join("") +
    [490, 450].map((x) => `<circle class="fg-fill" cx="${x}" cy="300" r="6" opacity="${fade(700 - x, 180, 330)}"/>`).join("");
  return `<defs><linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="180" x2="520"><stop offset="0" style="stop-color:var(--th)"/><stop offset="1" style="stop-color:var(--th);stop-opacity:.25"/></linearGradient>` +
    `<linearGradient id="${g}r" gradientUnits="userSpaceOnUse" x1="520" x2="180"><stop offset="0" style="stop-color:var(--th)"/><stop offset="1" style="stop-color:var(--th);stop-opacity:.25"/></linearGradient></defs>` +
    row(60, "DPS", fibre(180, 520, 60) + dps + box(110, 42, 70, 36, "Alice") + box(520, 42, 70, 36, "Bob")) +
    row(180, "COW", fibre(180, 520, 180) + cow + box(110, 162, 70, 36, "Alice") + box(520, 162, 70, 36, "Bob")) +
    row(300, "Twin-field", fibre(180, 312, 300) + fibre(408, 520, 300, true) + tf +
      box(110, 282, 70, 36, "Alice") + box(312, 282, 96, 36, "Charlie", "fg-hbox") + box(520, 282, 70, 36, "Bob"));
}

const FIGS = {
  nmr: [nmr, "Schematic. The SLOCC classes of three-qubit pure states that the ANN distinguishes, and the reduction from 128 real features to 18 canonical-form inputs, ranked by ANOVA."],
  weather: [weather, "Schematic. Illustrative temperature series with a classical baseline and a variational-circuit forecast; not data from the paper."],
  image: [image, "Circuit resources of four quantum image encodings for 16×16 images: qubit count against circuit depth on a log scale. Data from Tables 1–2 of the J. Supercomputing paper.", IMAGE_TABLE],
  fpga: [fpga, "Schematic. A variational quantum circuit (VQC) run as an FPGA kernel with HBM, for edge inference."],
  qkd: [qkd, "Schematic. Protocol layouts for DPS, COW and twin-field QKD studied at TCG CREST."],
};

const BY_PROJECT = {
  "nmr-entanglement": ["nmr"],
  "vqc-fpga": ["weather", "fpga"],
  "qir-qnn": ["image"],
  "qkd-testbeds": ["qkd"],
};

export function figuresFor(projectId) {
  return (BY_PROJECT[projectId] || []).map((k) => {
    const [draw, caption, extra = ""] = FIGS[k], id = `fig-${k}`;
    const svg = `<svg viewBox="0 0 640 360" style="font-family:var(--text)" role="img" aria-labelledby="${id}-cap" xmlns="http://www.w3.org/2000/svg">${draw(id)}</svg>`;
    // Figures keep a minimum width on phones so labels stay readable (at least 12px); they scroll sideways instead.
    return `<figure class="fig th-${k}">
      <div class="fig-scroll" tabindex="0" role="group" aria-label="Figure, scrolls sideways on small screens">${svg}</div>
      <figcaption id="${id}-cap">${caption}</figcaption>${extra}
    </figure>`;
  }).join("");
}
