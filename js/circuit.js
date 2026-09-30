/* Signature element: "circuit as CV".
   One qubit wire per profile.focus_areas entry, labelled with that text. Every wire
   starts in |0⟩, gets H, then the fixed gates below. The Bloch glyph at the end of each
   wire is the real reduced state of that qubit, simulated from this exact circuit: an
   entangled qubit is mixed, so its vector is shorter than the sphere's radius. Then
   measurement, and classical double lines lead to the metric tiles. The SVG is complete
   and static on its own (that frame is what build.py prerenders). Motion is added on top
   and only when the reader allows it: a decorative wave packet sweeps the wires, and on
   fine pointers the wire nearest the cursor lifts. */

const PATTERN = [ // [column, wire, gate, target] for CNOT; [column, wire, gate, p, q] for a p·π/q rotation
  [1, 1, "RZ", 1, 4], [1, 4, "RZ", 3, 4],
  [2, 0, "cnot", 1], [2, 3, "RY", 1, 3],
  [3, 3, "cnot", 4], [3, 2, "RY", 1, 2],
  [4, 0, "RY", 1, 2], [4, 2, "cnot", 3],
  [5, 0, "cnot", 2], [5, 4, "RX", 1, 3],
];
// Band values per digital-artist; the sweep runs once on load, then rests until Play.
const PACKET = { width: 28, opacity: 0.18 };
const DUR = 3.2, LEAD = 0.4; // seconds; keep in step with the .qc-packet animation (DESIGN.md §5)
// Time fraction at which the cubic-bezier(.45,0,.55,1) sweep reaches progress p, so gates dip as the band passes.
const easeTime = (p) => {
  const bx = (s) => 3 * (1 - s) ** 2 * s * 0.45 + 3 * (1 - s) * s * s * 0.55 + s ** 3;
  const by = (s) => 3 * (1 - s) * s * s + s ** 3;
  let lo = 0, hi = 1;
  for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (by(m) < p) lo = m; else hi = m; }
  return bx((lo + hi) / 2);
};

// Statevector simulation of H on every wire then PATTERN; returns each qubit's
// Bloch vector (Tr ρσx, Tr ρσy, Tr ρσz) from its reduced density matrix.
export function blochVectors(n) {
  const N = 1 << n, re = new Float64Array(N), im = new Float64Array(N);
  re[0] = 1;
  const apply = (q, m) => { // m = 2×2 complex matrix, row-major [re, im] pairs
    const b = 1 << q;
    for (let i = 0; i < N; i++) {
      if (i & b) continue;
      const k = i | b, xr = re[i], xi = im[i], yr = re[k], yi = im[k];
      re[i] = m[0] * xr - m[1] * xi + m[2] * yr - m[3] * yi;
      im[i] = m[0] * xi + m[1] * xr + m[2] * yi + m[3] * yr;
      re[k] = m[4] * xr - m[5] * xi + m[6] * yr - m[7] * yi;
      im[k] = m[4] * xi + m[5] * xr + m[6] * yi + m[7] * yr;
    }
  };
  const h = Math.SQRT1_2;
  for (let q = 0; q < n; q++) apply(q, [h, 0, h, 0, h, 0, -h, 0]);
  for (const [, w, g, a, d] of PATTERN) {
    if (w >= n || (g === "cnot" && a >= n)) continue;
    if (g === "cnot") {
      const cb = 1 << w, tb = 1 << a;
      for (let i = 0; i < N; i++) {
        if (!(i & cb) || (i & tb)) continue;
        const k = i | tb;
        [re[i], re[k]] = [re[k], re[i]];
        [im[i], im[k]] = [im[k], im[i]];
      }
      continue;
    }
    const t = Math.PI * a / d / 2, c = Math.cos(t), s = Math.sin(t);
    apply(w, g === "RX" ? [c, 0, 0, -s, 0, -s, c, 0]
      : g === "RY" ? [c, 0, -s, 0, s, 0, c, 0]
      : [c, -s, 0, 0, 0, 0, c, s]);
  }
  const out = [];
  for (let q = 0; q < n; q++) {
    const b = 1 << q;
    let x = 0, y = 0, z = 0; // ρ01 = Σ ψ(q=0)·conj ψ(q=1); x = 2 Re ρ01, y = −2 Im ρ01
    for (let i = 0; i < N; i++) {
      const p = re[i] * re[i] + im[i] * im[i];
      if (i & b) { z -= p; continue; }
      z += p;
      const k = i | b;
      x += re[i] * re[k] + im[i] * im[k];
      y += im[i] * re[k] - re[i] * im[k];
    }
    out.push([2 * x, -2 * y, z]);
  }
  return out;
}

const motionQ = window.matchMedia("(prefers-reduced-motion: no-preference)");
const wideQ = window.matchMedia("(min-width: 640px)");
const fineQ = window.matchMedia("(pointer: fine)");

export function mountCircuit(host, labels, tiles) {
  if (!host) return;
  const names = labels && labels.length ? labels : ["", "", "", "", ""];
  const draw = () => {
    host.innerHTML = svg(names, wideQ.matches ? 680 : 360);
    const svgEl = host.firstElementChild;
    if (tiles) tiles.style.setProperty("--ping", svgEl.dataset.ping + "s");
  };
  draw();
  wideQ.addEventListener("change", draw);

  const hero = host.closest(".hero") || host;
  const live = () => hero.classList.toggle("is-live", motionQ.matches);
  live();
  motionQ.addEventListener("change", live);

  // WCAG 2.2.2: a loop longer than 5 s needs a user pause; nothing animates off-screen either.
  let offscreen = false, held = false, done = false;
  const sync = () => hero.classList.toggle("is-paused", offscreen || held);
  // Reuse the prerendered button so the build output and live page don't both add one.
  let btn = host.parentNode.querySelector(".qc-pause");
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "qc-pause";
    host.after(btn);
  }
  const label = () => {
    btn.setAttribute("aria-pressed", String(held || done));
    btn.textContent = held || done ? "Play motion" : "Pause motion";
  };
  host.addEventListener("animationend", (e) => {
    if (e.animationName !== "packet") return;
    done = true; hero.classList.add("is-done"); label();
  });
  btn.addEventListener("click", () => {
    if (done) {
      done = false;
      hero.classList.remove("is-done", "is-live");
      void hero.offsetWidth; // restart the one-shot sweep
      hero.classList.add("is-live");
    } else held = !held;
    label(); sync();
  });
  label();
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => { offscreen = !en.isIntersecting; sync(); }).observe(host);
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
    s.querySelectorAll("text.qc-lbl").forEach((t, i) => t.classList.toggle("is-near", i === best));
  });
  host.addEventListener("pointerleave", () => {
    const s = host.firstElementChild;
    s.classList.remove("has-near");
    s.querySelectorAll(".is-near").forEach((row) => row.classList.remove("is-near"));
  });
}

function svg(names, W) {
  const n = names.length, rowH = 50, top = 34, R = 10;
  const H = top + (n - 1) * rowH + 26;
  const x0 = 4, xs = x0 + 22, span = W - xs - 28;
  const col = (c) => Math.round(xs + 16 + span * (c / 7.4)); // 0..5 gates, 6 Bloch, 7 M
  const y = (w) => top + w * rowH;
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const at = (x) => (LEAD + DUR * easeTime((x + PACKET.width / 2) / (W + PACKET.width))).toFixed(2);
  const delay = (x) => `style="--d:${at(x)}s"`;
  const box = (x, yy, t) => `<g class="qc-g" ${delay(x)}><rect class="qc-box" x="${x - 13}" y="${yy - 11}" width="26" height="22" rx="3"/><text class="qc-txt" x="${x}" y="${yy + 3.5}" text-anchor="middle">${t}</text></g>`;
  const rot = (x, yy, g, p, q) => `<g class="qc-g" ${delay(x)}><rect class="qc-box" x="${x - 13}" y="${yy - 11}" width="26" height="22" rx="3"/><text class="qc-txt" x="${x - 1}" y="${yy + 3.5}" text-anchor="middle">R<tspan class="qc-sub" dy="2.5">${g[1].toLowerCase()}</tspan></text><text class="qc-ang" x="${x}" y="${yy + 21}" text-anchor="middle">${p === 1 ? "" : p}π/${q}</text></g>`;
  // Bloch projection: z up, view turned 40° so +x points down-left and +y down-right.
  const ca = Math.cos(-0.7), sa = Math.sin(-0.7);
  const proj = ([bx, by, bz]) => [R * (bx * sa + by * ca), R * (-bz + 0.35 * (bx * ca - by * sa))].map((v) => +v.toFixed(2));
  const vecs = blochVectors(n);

  let rows = "", multi = "", lbls = "";
  for (let w = 0; w < n; w++) {
    const yy = y(w), xb = col(6), xm = col(7);
    const [vx, vy] = proj(vecs[w]);
    // Mono at 11px is ~6.6px per glyph; the pad keeps CNOT verticals from crossing the text.
    lbls += `<rect class="qc-pad" x="${x0 - 2}" y="${yy - 25}" width="${Math.ceil(String(names[w]).length * 6.6) + 4}" height="14" rx="2"/><text class="qc-lbl" x="${x0}" y="${yy - 15}">${esc(names[w])}</text>`;
    rows += `<g class="qc-row" data-y="${yy}">
<text class="qc-ket" x="${x0}" y="${yy + 3.5}">|0⟩</text>
<line class="qc-wire" x1="${xs}" y1="${yy}" x2="${xm - 12}" y2="${yy}"/>
<path class="qc-feed" d="M${xm + 12} ${yy - 1.25}H${W}M${xm + 12} ${yy + 1.25}H${W}"/>
${box(col(0), yy, "H")}
${PATTERN.filter((g) => g[1] === w && g[2] !== "cnot").map((g) => rot(col(g[0]), yy, g[2], g[3], g[4])).join("")}
<g class="qc-g qc-bloch" ${delay(xb)} transform="translate(${xb} ${yy})"><circle r="${R}"/><ellipse rx="${R}" ry="${R * 0.35}"/><line class="qc-axis" y1="-${R}" y2="${R}"/><line class="qc-vec" x2="${vx}" y2="${vy}"/><circle class="qc-tip" cx="${vx}" cy="${vy}" r="1.6"/></g>
<g class="qc-g" ${delay(xm)}><rect class="qc-box qc-meas" x="${xm - 12}" y="${yy - 11}" width="24" height="22" rx="3"/><path class="qc-arc" d="M${xm - 7} ${yy + 5}A7 7 0 0 1 ${xm + 7} ${yy + 5}"/><line class="qc-arc" x1="${xm}" y1="${yy + 5}" x2="${xm + 5}" y2="${yy - 5}"/></g>
</g>`;
  }
  PATTERN.filter((g) => g[2] === "cnot" && g[1] < n && g[3] < n).forEach(([c, w, , t]) => {
    const x = col(c), a = y(w), b = y(t);
    multi += `<g class="qc-g" ${delay(x)}><line class="qc-link" x1="${x}" y1="${a}" x2="${x}" y2="${b + (b > a ? 9 : -9)}"/><circle class="qc-dot" cx="${x}" cy="${a}" r="3.6"/><circle class="qc-targ" cx="${x}" cy="${b}" r="9"/><line class="qc-link" x1="${x - 9}" y1="${b}" x2="${x + 9}" y2="${b}"/></g>`;
  });

  const label = "Quantum circuit with one wire per focus area: " + names.join(", ");
  return `<svg class="qc" viewBox="0 0 ${W} ${H}" data-ping="${at(col(7))}" style="--qc-w:${W}px;--qc-pw:${PACKET.width}px" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="qc-packet-g"><stop class="qc-phase" offset="0" stop-opacity="0"/><stop class="qc-phase" offset=".5" stop-opacity="${PACKET.opacity}"/><stop class="qc-phase" offset="1" stop-opacity="0"/></linearGradient></defs>
${rows}<g class="qc-multi">${multi}</g><g class="qc-lbls">${lbls}</g>
<rect class="qc-packet" x="-${PACKET.width}" y="0" width="${PACKET.width}" height="${H}" fill="url(#qc-packet-g)"/>
</svg>`;
}
