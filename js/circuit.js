/* Signature element: "circuit as CV".
   One qubit wire per profile.focus_areas entry, labelled with that text. Gates, a
   Quirk-style Bloch-sphere readout, then measurement; the measurement hairlines lead
   to the metric tiles. The SVG is complete and static on its own (that frame is what
   build.py prerenders). Motion is added on top and only when the reader allows it:
   a Gaussian wave packet sweeps the wires and shifts phase colour, and on fine pointers
   the wire nearest the cursor lifts. */

const PATTERN = [ // [column, wire, gate, cnot target]
  [1, 0, "cnot", 1], [1, 2, "RY"],
  [2, 1, "RZ"], [2, 3, "cnot", 4],
  [3, 0, "RX"], [3, 2, "cnot", 3],
  [4, 1, "RY"], [4, 4, "RZ"],
  [5, 0, "cnot", 2], [5, 3, "RX"],
];
const DUR = 6.4; // seconds per sweep; keep in step with the .qc-packet animation

const motionQ = window.matchMedia("(prefers-reduced-motion: no-preference)");
const wideQ = window.matchMedia("(min-width: 640px)");
const fineQ = window.matchMedia("(pointer: fine)");

export function mountCircuit(host, labels, tiles) {
  if (!host) return;
  const names = labels && labels.length ? labels : ["", "", "", "", ""];
  const draw = () => {
    host.innerHTML = svg(names, wideQ.matches ? 680 : 360);
    const svgEl = host.firstElementChild;
    const mx = +svgEl.dataset.mx, w = +svgEl.dataset.w;
    if (tiles) tiles.style.setProperty("--ping", (DUR * mx / w).toFixed(2) + "s");
  };
  draw();
  wideQ.addEventListener("change", draw);

  const hero = host.closest(".hero") || host;
  const live = () => hero.classList.toggle("is-live", motionQ.matches);
  live();
  motionQ.addEventListener("change", live);

  // Nothing animates off-screen.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => hero.classList.toggle("is-paused", !en.isIntersecting))
      .observe(host);
  }

  host.addEventListener("pointermove", (e) => {
    if (!fineQ.matches || !motionQ.matches) return;
    const s = host.firstElementChild, r = s.getBoundingClientRect();
    const rows = s.querySelectorAll(".qc-row");
    const y = (e.clientY - r.top) / r.height * s.viewBox.baseVal.height;
    let best = 0, dist = Infinity;
    rows.forEach((row, i) => {
      const d = Math.abs(+row.dataset.y - y);
      if (d < dist) { dist = d; best = i; }
    });
    s.classList.add("has-near");
    rows.forEach((row, i) => row.classList.toggle("is-near", i === best));
  });
  host.addEventListener("pointerleave", () => {
    const s = host.firstElementChild;
    s.classList.remove("has-near");
    s.querySelectorAll(".is-near").forEach((row) => row.classList.remove("is-near"));
  });
}

function svg(names, W) {
  const n = names.length, rowH = 50, top = 34;
  const H = top + (n - 1) * rowH + 22;
  const x0 = 4, span = W - x0 - 28;
  const col = (c) => Math.round(x0 + 18 + span * (c / 7.4)); // 0..5 gates, 6 Bloch, 7 M
  const y = (w) => top + w * rowH;
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const delay = (x) => `style="--d:${(DUR * x / W).toFixed(2)}s"`;
  const box = (x, yy, t) => `<g class="qc-g" ${delay(x)}><rect class="qc-box" x="${x - 13}" y="${yy - 11}" width="26" height="22" rx="3"/><text class="qc-txt" x="${x}" y="${yy + 3.5}" text-anchor="middle">${t}</text></g>`;

  let rows = "", multi = "";
  for (let w = 0; w < n; w++) {
    const yy = y(w), xb = col(6), xm = col(7);
    // A fixed, distinct state per wire for the Bloch readout (decorative).
    const th = 0.5 + w * 0.42, ph = 0.9 + w * 1.3;
    const vx = (10 * Math.sin(th) * Math.cos(ph)).toFixed(1), vy = (-10 * Math.cos(th) + 3.5 * Math.sin(th) * Math.sin(ph)).toFixed(1);
    rows += `<g class="qc-row" data-y="${yy}">
<text class="qc-lbl" x="${x0}" y="${yy - 15}">${esc(names[w])}</text>
<line class="qc-wire" x1="${x0}" y1="${yy}" x2="${xm - 12}" y2="${yy}"/>
<line class="qc-feed" x1="${xm + 12}" y1="${yy}" x2="${W}" y2="${yy}"/>
${box(col(0), yy, "H")}
${PATTERN.filter((g) => g[1] === w && g[2] !== "cnot").map((g) => box(col(g[0]), yy, g[2])).join("")}
<g class="qc-g qc-bloch" ${delay(xb)} transform="translate(${xb} ${yy})"><circle r="10"/><ellipse rx="10" ry="3.5"/><line class="qc-axis" y1="-10" y2="10"/><line class="qc-vec" x2="${vx}" y2="${vy}"/><circle class="qc-tip" cx="${vx}" cy="${vy}" r="1.6"/></g>
<g class="qc-g" ${delay(xm)}><rect class="qc-box qc-meas" x="${xm - 12}" y="${yy - 11}" width="24" height="22" rx="3"/><path class="qc-arc" d="M${xm - 7} ${yy + 5}A7 7 0 0 1 ${xm + 7} ${yy + 5}"/><line class="qc-arc" x1="${xm}" y1="${yy + 5}" x2="${xm + 5}" y2="${yy - 5}"/></g>
</g>`;
  }
  PATTERN.filter((g) => g[2] === "cnot" && g[1] < n && g[3] < n).forEach(([c, w, , t]) => {
    const x = col(c), a = y(w), b = y(t);
    multi += `<g class="qc-g" ${delay(x)}><line class="qc-link" x1="${x}" y1="${a}" x2="${x}" y2="${b + (b > a ? 9 : -9)}"/><circle class="qc-dot" cx="${x}" cy="${a}" r="3.6"/><circle class="qc-targ" cx="${x}" cy="${b}" r="9"/><line class="qc-link" x1="${x - 9}" y1="${b}" x2="${x + 9}" y2="${b}"/></g>`;
  });

  const label = "Quantum circuit with one wire per focus area: " + names.join(", ");
  return `<svg class="qc" viewBox="0 0 ${W} ${H}" data-w="${W}" data-mx="${col(7)}" style="--qc-w:${W}px" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="qc-packet-g"><stop class="qc-phase" offset="0" stop-opacity="0"/><stop class="qc-phase" offset=".5" stop-opacity=".55"/><stop class="qc-phase" offset="1" stop-opacity="0"/></linearGradient></defs>
${rows}<g class="qc-multi">${multi}</g>
<rect class="qc-packet" x="-56" y="0" width="56" height="${H}" fill="url(#qc-packet-g)"/>
</svg>`;
}
