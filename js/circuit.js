/* Signature element: a live quantum circuit motif.
   Draws qubit wires, single-qubit gates, CNOTs, and measurement symbols.
   A "pulse" travels left-to-right along the wires, lighting gates as it passes.
   Purely decorative → aria-hidden. Fully static under prefers-reduced-motion. */

export function mountCircuit(host) {
  if (!host) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const W = 520, H = 260;
  const wires = 5;
  const top = 26, gap = (H - top * 2) / (wires - 1);
  const x0 = 34, x1 = W - 42;

  // Gate layout: {col, wire, type} — type: h|rx|ry|rz|cnot(target)|m
  const cols = [70, 130, 190, 250, 310, 370, 430];
  const gates = [
    { c: 0, w: 0, t: "H" }, { c: 0, w: 1, t: "H" }, { c: 0, w: 2, t: "H" },
    { c: 0, w: 3, t: "H" }, { c: 0, w: 4, t: "H" },
    { c: 1, w: 0, t: "cnot", tgt: 1 },
    { c: 1, w: 2, t: "RY" },
    { c: 2, w: 1, t: "RZ" }, { c: 2, w: 3, t: "cnot", tgt: 4 },
    { c: 3, w: 0, t: "RX" }, { c: 3, w: 2, t: "cnot", tgt: 3 },
    { c: 4, w: 1, t: "RY" }, { c: 4, w: 4, t: "RZ" },
    { c: 5, w: 0, t: "cnot", tgt: 2 }, { c: 5, w: 3, t: "RX" },
    { c: 6, w: 0, t: "M" }, { c: 6, w: 1, t: "M" }, { c: 6, w: 2, t: "M" },
    { c: 6, w: 3, t: "M" }, { c: 6, w: 4, t: "M" }
  ];

  const y = (w) => top + w * gap;
  let s = "";

  // wires
  for (let w = 0; w < wires; w++) {
    s += `<line class="qc-wire" x1="${x0}" y1="${y(w)}" x2="${x1}" y2="${y(w)}"/>`;
    s += `<text class="qc-lbl" x="${x0 - 10}" y="${y(w) + 3.5}" text-anchor="end">q${w}</text>`;
  }

  // gates
  gates.forEach((g, i) => {
    const gx = cols[g.c], gy = y(g.w);
    const d = (g.c * 0.13).toFixed(2); // stagger by column
    if (g.t === "cnot") {
      const ty = y(g.tgt);
      s += `<g class="qc-gate" style="--d:${d}s">
              <line class="qc-link" x1="${gx}" y1="${gy}" x2="${gx}" y2="${ty}"/>
              <circle class="qc-dot" cx="${gx}" cy="${gy}" r="4"/>
              <circle class="qc-targ" cx="${gx}" cy="${ty}" r="9"/>
              <line class="qc-cross" x1="${gx - 9}" y1="${ty}" x2="${gx + 9}" y2="${ty}"/>
              <line class="qc-cross" x1="${gx}" y1="${ty - 9}" x2="${gx}" y2="${ty + 9}"/>
            </g>`;
    } else if (g.t === "M") {
      s += `<g class="qc-gate" style="--d:${d}s">
              <rect class="qc-box qc-meas" x="${gx - 11}" y="${gy - 11}" width="22" height="22" rx="2"/>
              <path class="qc-arc" d="M ${gx - 6} ${gy + 4} A 6 6 0 0 1 ${gx + 6} ${gy + 4}"/>
              <line class="qc-needle" x1="${gx}" y1="${gy + 4}" x2="${gx + 5}" y2="${gy - 4}"/>
            </g>`;
    } else {
      s += `<g class="qc-gate" style="--d:${d}s">
              <rect class="qc-box" x="${gx - 13}" y="${gy - 12}" width="26" height="24" rx="2"/>
              <text class="qc-txt" x="${gx}" y="${gy + 4}" text-anchor="middle">${g.t}</text>
            </g>`;
    }
  });

  // travelling pulse
  if (!reduce) {
    s += `<rect class="qc-pulse" x="${x0}" y="0" width="2" height="${H}"/>`;
  }

  host.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img"
          aria-label="Decorative quantum circuit diagram" class="qc${reduce ? " qc--static" : ""}">
       ${s}
     </svg>`;
}
