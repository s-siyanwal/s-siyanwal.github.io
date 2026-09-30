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
  const W = [110, 40], G = [290, 40], B = [[80, 150], [200, 150], [320, 150]], S = [200, 260];
  const edges = B.flatMap(([x, y]) => [
    `<line class="fg-faint" x1="${x}" y1="${y}" x2="${S[0]}" y2="${S[1] + 2}"/>`,
    `<line class="fg-faint" x1="${x}" y1="${y}" x2="${W[0]}" y2="${W[1] + 32}"/>`,
    `<line class="fg-faint" x1="${x}" y1="${y}" x2="${G[0]}" y2="${G[1] + 32}"/>`]).join("");
  return edges +
    box(W[0] - 40, W[1], 80, 34, "W", "fg-hbox") + box(G[0] - 40, G[1], 80, 34, "GHZ", "fg-hbox") +
    B.map(([x, y], i) => box(x - 38, y - 17, 76, 34, `BS${i + 1}`)).join("") +
    box(S[0] - 40, S[1], 80, 34, "SEP") +
    box(440, 16, 180, 56, ["density matrix", "128 elements"]) + arrow(530, 72, 530, 104) +
    box(440, 104, 180, 56, ["18 elements", "ANOVA-ranked"]) + arrow(530, 160, 530, 192) +
    box(440, 192, 180, 44, "ANN", "fg-hbox") + arrow(530, 236, 530, 268) +
    box(440, 268, 180, 56, ["GME test", "SLOCC class"]);
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
<text x="70" y="305.0" text-anchor="end" font-size="15" fill="var(--ink-faint,#4d5b57)">10<tspan dy="-7" font-size="11">3</tspan></text>
<line x1="80" y1="196.0" x2="600" y2="196.0" stroke="var(--rule,#c9d3cf)" stroke-width="1"/>
<text x="70" y="201.0" text-anchor="end" font-size="15" fill="var(--ink-faint,#4d5b57)">10<tspan dy="-7" font-size="11">4</tspan></text>
<line x1="80" y1="92.0" x2="600" y2="92.0" stroke="var(--rule,#c9d3cf)" stroke-width="1"/>
<text x="70" y="97.0" text-anchor="end" font-size="15" fill="var(--ink-faint,#4d5b57)">10<tspan dy="-7" font-size="11">5</tspan></text>
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
<text x="484.0" y="236.1" text-anchor="end" font-size="13" fill="var(--ink-faint,#4d5b57)">16 qubits · depth 5,612</text>
<circle cx="288.0" cy="129.8" r="7" fill="var(--th-image)"/>
<text x="300.0" y="125.8" text-anchor="start" font-size="16" font-weight="600" fill="var(--ink,#12201f)">FTQR</text>
<text x="300.0" y="143.8" text-anchor="start" font-size="13" fill="var(--ink-faint,#4d5b57)">12 qubits · depth 43,273</text>
<circle cx="132.0" cy="122.9" r="7" fill="var(--th-image)"/>
<text x="124.0" y="148.9" text-anchor="start" font-size="16" font-weight="600" fill="var(--ink,#12201f)">NASS</text>
<text x="124.0" y="166.9" text-anchor="start" font-size="13" fill="var(--ink-faint,#4d5b57)">9 qubits · depth 50,436</text>
<circle cx="236.0" cy="81.8" r="7" fill="var(--th-image)"/>
<text x="248.0" y="77.8" text-anchor="start" font-size="16" font-weight="600" fill="var(--ink,#12201f)">FRQCI</text>
<text x="248.0" y="95.8" text-anchor="start" font-size="13" fill="var(--ink-faint,#4d5b57)">11 qubits · depth 125,299</text>`;

const IMAGE_TABLE = `<details class="fig-data"><summary>Data (Tables 1–2)</summary>
  <table><caption>Circuit resources at 16×16</caption>
    <thead><tr><th scope="col">Encoding</th><th scope="col">Qubits</th><th scope="col">Depth</th><th scope="col">Total gates</th></tr></thead>
    <tbody>${[["QBIR", 16, "5,612", "9,701"], ["FTQR", 12, "43,273", "59,683"], ["NASS", 9, "50,436", "72,713"], ["FRQCI", 11, "125,299", "164,353"]]
      .map(([e, q, d, g]) => `<tr><th scope="row">${e}</th><td>${q}</td><td>${d}</td><td>${g}</td></tr>`).join("")}</tbody>
  </table></details>`;

function fpga() {
  const x0 = 110, unit = 66;
  return `<text class="fg-t" x="${x0 - 14}" y="86" text-anchor="end">FPGA</text>` +
    `<rect class="fg-fill" x="${x0}" y="64" width="${unit}" height="34" rx="2"/>` +
    `<text class="fg-s" x="${x0 + unit + 12}" y="86">291.8 µs</text>` +
    `<text class="fg-t" x="${x0 - 14}" y="172" text-anchor="end">GPU</text>` +
    `<rect class="fg-box" x="${x0}" y="150" width="${(unit * 6.7).toFixed(1)}" height="34" rx="2"/>` +
    `<text class="fg-s" x="${x0 + 12}" y="172">GPU (6.7× slower)</text>` +
    arrow(x0, 214, x0 + unit * 6.7, 214) + `<text class="fg-s" x="${x0}" y="236">inference latency</text>` +
    box(20, 280, 120, 46, "host") + arrow(140, 303, 196, 303) +
    box(198, 280, 220, 46, "VQC kernel (HLS)", "fg-hbox") + arrow(418, 303, 474, 303) +
    box(476, 280, 144, 46, "Alveo U55C");
}

function qkd(uid) {
  const g = `${uid}-loss`;
  const fibre = (x1, x2, y, rev) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="url(#${g}${rev ? "r" : ""})" stroke-width="3"/>`;
  const fade = (x, a, b) => (1 - .7 * (x - a) / (b - a)).toFixed(2);
  const row = (y, label, mid) => `<text class="fg-s" x="20" y="${y + 5}">${label}</text>` + mid;
  const dps = [0, 1, 1, 0, 1, 0, 0].map((ph, i) => {
    const x = 222 + i * 44;
    return `<circle class="fg-fill" cx="${x}" cy="60" r="6" opacity="${fade(x, 200, 500)}"/><text class="fg-s" x="${x}" y="40" text-anchor="middle">${ph ? "π" : "0"}</text>`;
  }).join("");
  const cow = [1, 1, 0, 1, 0, 1, 1].map((on, i) => {
    const x = 222 + i * 44;
    return on ? `<circle class="fg-fill" cx="${x}" cy="180" r="6" opacity="${fade(x, 200, 500)}"/>`
      : `<circle cx="${x}" cy="180" r="6" fill="none" stroke="var(--ink-faint)" stroke-dasharray="2 2"/>`;
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
  nmr: [nmr, "Schematic. The six SLOCC classes of three-qubit pure states that the ANN distinguishes, and the reduction from 128 density-matrix elements to 18 ANOVA-ranked inputs."],
  weather: [weather, "Schematic. Illustrative temperature series with a classical baseline and a variational-circuit forecast; not data from the paper."],
  image: [image, "Circuit resources of four quantum image encodings for 16×16 images: qubit count against circuit depth on a log scale. Data from Tables 1–2 of the J. Supercomputing paper.", IMAGE_TABLE],
  fpga: [fpga, "Schematic. Relative inference latency, FPGA vs GPU, as reported in the project."],
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
    return `<figure class="fig th-${k}">
      <svg viewBox="0 0 640 360" style="font-family:var(--text)" role="img" aria-labelledby="${id}-cap" xmlns="http://www.w3.org/2000/svg">${draw(id)}</svg>
      <figcaption id="${id}-cap">${caption}</figcaption>${extra}
    </figure>`;
  }).join("");
}
