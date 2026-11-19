/* TensNet: tensor networks for 2D flow.
   The core idea in one picture: a field on a grid is a matrix, and keeping only its χ largest singular values
   (SVD truncation, what MPS compression does bond by bond) stores it with far fewer numbers. Drag χ and compare
   the compressed field with the original, the error and the storage. The field is synthetic (a cylinder wake
   sketch made of vortices), computed in your browser; it is not data from the manuscript. */
import { shell, svg, el, slider, fmt } from "./ui.js";

const M = 32, N = 96;

function field() {
  const f = new Float64Array(M * N), cx = 16, cy = 16, R = 4.2;
  for (let i = 0; i < M; i++) for (let j = 0; j < N; j++) {
    const y = i - cy, x = j - cx, r2 = x * x + y * y;
    let v = r2 < R * R ? 0 : 0.6 * y * (1 - (R * R) / r2) / 16;                   // uniform flow past a cylinder (stream function)
    for (let k = 0; k < 7; k++) {                                                    // alternating vortices downstream
      const vx = cx + 9 + k * 10.5, vy = cy + (k % 2 ? 4.5 : -4.5), s = k % 2 ? 1 : -1;
      const d2 = (j - vx) ** 2 + (i - vy) ** 2;
      v += s * 0.9 * Math.exp(-d2 / (8 + k * 1.4)) * Math.exp(-k * 0.08);
    }
    f[i * N + j] = v;
  }
  return f;
}

/* Left singular vectors of A (M×N) from the eigenvectors of A·Aᵀ (cyclic Jacobi), sorted by singular value. */
function leftSVD(A) {
  const B = new Float64Array(M * M), V = new Float64Array(M * M);
  for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) { let s = 0; for (let k = 0; k < N; k++) s += A[i * N + k] * A[j * N + k]; B[i * M + j] = s; }
  for (let i = 0; i < M; i++) V[i * M + i] = 1;
  for (let sweep = 0; sweep < 30; sweep++) {
    let off = 0;
    for (let p = 0; p < M; p++) for (let q = p + 1; q < M; q++) {
      const bpq = B[p * M + q]; off += bpq * bpq;
      if (Math.abs(bpq) < 1e-14) continue;
      const th = (B[q * M + q] - B[p * M + p]) / (2 * bpq);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < M; k++) { const bkp = B[k * M + p], bkq = B[k * M + q]; B[k * M + p] = c * bkp - s * bkq; B[k * M + q] = s * bkp + c * bkq; }
      for (let k = 0; k < M; k++) { const bpk = B[p * M + k], bqk = B[q * M + k]; B[p * M + k] = c * bpk - s * bqk; B[q * M + k] = s * bpk + c * bqk; }
      for (let k = 0; k < M; k++) { const vkp = V[k * M + p], vkq = V[k * M + q]; V[k * M + p] = c * vkp - s * vkq; V[k * M + q] = s * vkp + c * vkq; }
    }
    if (off < 1e-20) break;
  }
  const order = [...Array(M).keys()].sort((x, y) => B[y * M + y] - B[x * M + x]);
  return { U: order.map((k) => Float64Array.from({ length: M }, (_, i) => V[i * M + k])), sig: order.map((k) => Math.sqrt(Math.max(0, B[k * M + k]))) };
}

function paint(canvas, f, lo, hi) {
  const ctx = canvas.getContext("2d"), img = ctx.createImageData(N, M), cs = getComputedStyle(document.documentElement);
  const parse = (n) => cs.getPropertyValue(n).split(",").map(Number);
  const A = parse("--field-a"), B = parse("--field-b"), bg = cs.getPropertyValue("--bg").trim();
  const bgc = /^#/.test(bg) ? [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16)) : [242, 239, 232];
  for (let k = 0; k < M * N; k++) {
    const t = (f[k] - lo) / (hi - lo || 1), u = Math.abs(t - 0.5) * 2, col = t > 0.5 ? A : B;
    for (let ch = 0; ch < 3; ch++) img.data[k * 4 + ch] = Math.round(bgc[ch] * (1 - u) + col[ch] * u);
    img.data[k * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

export function mount(host) {
  const ui = shell(host, {
    title: "Compress a flow field with a bond dimension",
    lede: "χ is how many singular values are kept. Watch the error fall and the storage grow as χ rises.",
    note: "Synthetic field and SVD computed in your browser to show the idea. The manuscript's numbers (submitted, under review): at D_max = 30 the L2 error is below 10⁻² and memory falls from about 8 GB to 5.8 MB.",
  });
  const A = field();
  let lo = Infinity, hi = -Infinity; for (const v of A) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const { U, sig } = leftSVD(A);
  const mk = (label) => { const c = document.createElement("canvas"); c.width = N; c.height = M; c.className = "ab-canvas"; c.setAttribute("role", "img"); c.setAttribute("aria-label", label); return c; };
  const c0 = mk("Original synthetic flow field"), c1 = mk("Field compressed to bond dimension chi");
  const pair = document.createElement("div");
  pair.className = "ab-pair";
  pair.innerHTML = `<figure><figcaption class="ab-k">Original · ${M}×${N} grid</figcaption></figure><figure><figcaption class="ab-k ab-chi-cap"></figcaption></figure>`;
  pair.children[0].prepend(c0); pair.children[1].prepend(c1);
  ui.fig.append(pair);
  const spec = svg(640, 90, "Singular values on a log scale; the kept ones are highlighted");
  const smax = Math.log10(sig[0]), smin = Math.log10(Math.max(sig[M - 1], sig[0] * 1e-8));
  const sb = sig.map((v, k) => {
    const h = 10 + 70 * ((Math.log10(Math.max(v, 1e-30)) - smin) / (smax - smin || 1));
    return el(spec, "rect", { x: 10 + k * 19.5, y: 85 - Math.max(2, h), width: 15, height: Math.max(2, h), class: "fg-fill" });
  });
  ui.fig.append(spec);
  paint(c0, A, lo, hi);
  const out = document.createElement("p");
  out.className = "ab-readout";
  ui.controls.append(out);
  const recon = (chi) => {
    // rank-χ approximation: P = U_χ U_χᵀ A
    const R = new Float64Array(M * N);
    for (let k = 0; k < chi; k++) {
      const u = U[k];
      for (let j = 0; j < N; j++) { let s = 0; for (let i = 0; i < M; i++) s += u[i] * A[i * N + j]; for (let i = 0; i < M; i++) R[i * N + j] += u[i] * s; }
    }
    return R;
  };
  slider(ui.controls, {
    label: "Bond dimension χ", min: 1, max: 24, step: 1, value: 4, fmt: (v) => String(v),
    onInput: (chi) => {
      const R = recon(chi);
      let e = 0, n = 0; for (let k = 0; k < M * N; k++) { e += (A[k] - R[k]) ** 2; n += A[k] ** 2; }
      paint(c1, R, lo, hi);
      sb.forEach((r, k) => r.setAttribute("opacity", k < chi ? "1" : "0.22"));
      const full = M * N, kept = chi * (M + N + 1);
      pair.querySelector(".ab-chi-cap").textContent = `Kept χ = ${chi}`;
      out.innerHTML = `relative L2 error <strong>${fmt(Math.sqrt(e / n), 4)}</strong><br>numbers stored: ${kept.toLocaleString("en")} instead of ${full.toLocaleString("en")} (${fmt((kept / full) * 100, 1)}%)`;
      ui.live.textContent = `Bond dimension ${chi}: relative error ${fmt(Math.sqrt(e / n), 4)}, storing ${kept} of ${full} numbers.`;
    },
  }).set(4);
  return {};
}
