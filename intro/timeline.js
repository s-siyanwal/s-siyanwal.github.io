/* Shared maths for the intro: easing curves, the wave geometry, and the detector hits. Both renderers (WebGL and
   the 2D fallback) draw from the same numbers, so they show the same piece.
   Coordinates are CSS pixels with y pointing down. */
import { CONFIG as C } from "./config.js";

/* Cubic-bezier easing, as in CSS: Newton steps with a bisection fallback. */
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) { const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= (X(t) - x) / d; }
    if (!(t >= 0 && t <= 1) || Math.abs(X(t) - x) > 1e-4) {
      let lo = 0, hi = 1; t = x;
      for (let i = 0; i < 24; i++) { if (X(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    }
    return Y(t);
  };
}
export const E = { out: bezier(...C.ease.out), inOut: bezier(...C.ease.inOut), glide: bezier(...C.ease.glide) };
export const seg = (T, a, b) => Math.min(1, Math.max(0, (T - a) / (b - a)));
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* Wave geometry for a viewport. Two sources sit sep apart on a horizontal line through the centre; each emits K
   concentric wavefronts spaced lam apart, the outermost at radius R once the wave has spread. R fits the height
   of a landscape screen; on a portrait phone the rings may run off the sides. */
export function geometry(W, H, mobile) {
  const R = C.wave.reach * Math.min(H / 2, 0.75 * W);
  const K = mobile ? C.wave.rings.mobile : C.wave.rings.desktop;
  const lam = R / K;
  return { cx: W / 2, cy: H / 2, R, K, lam, sep: C.wave.sep * lam };
}

/* Brightness of wavefront number x (0 = the front) at distance d from its source. The shader uses the same formula. */
export function envelope(x, d, g) {
  return Math.exp(-Math.max(x, 0) * C.wave.decay) * (1 - smooth(g.K - 3, g.K, x)) * smooth(0, 2.5 * g.lam, d);
}

/* Detector hits: the points where a wavefront of one source crosses a wavefront of the other, once the wave has
   come to rest. Those crossings lie on the bright interference fringes, and they are exactly where the shader's
   lines contract to during the collapse, so the lines resolve into these points with no jump. */
export function crossings(g, W, H, max) {
  const s = g.sep, ax = g.cx - s / 2, out = [];
  for (let i = 0; i < g.K; i++) {
    const rA = g.R - i * g.lam;
    for (let j = 0; j < g.K; j++) {
      const rB = g.R - j * g.lam;
      const a = (rA * rA - rB * rB + s * s) / (2 * s), h2 = rA * rA - a * a;
      if (h2 <= 0) continue;
      const h = Math.sqrt(h2), x = ax + a;
      const vis = envelope(i, rA, g) * envelope(j, rB, g);
      if (vis < 0.02) continue;
      for (const y of [g.cy - h, g.cy + h]) if (x > 8 && x < W - 8 && y > 8 && y < H - 8) out.push({ x0: x, y0: y, vis });
    }
  }
  out.sort((p, q) => q.vis - p.vis);
  const hits = out.slice(0, max), top = hits.length ? hits[0].vis : 1;
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const p of hits) { p.vis /= top; p.r = rnd(); }
  return hits;
}

/* Pair each hit with a point on the name. Both sets are sorted along the same diagonal, so the flows never cross
   and the name forms from left to right. Each path is a quadratic curve bent to the same side. */
export function assign(hits, targets) {
  if (!targets || !targets.length) return false;
  const key = (x, y) => x + 0.3 * y;
  const hs = [...hits].sort((p, q) => key(p.x0, p.y0) - key(q.x0, q.y0));
  const ts = targets.map((p, i) => [p[0], p[1], i]).sort((p, q) => key(p[0], p[1]) - key(q[0], q[1]));
  let minX = Infinity, maxX = -Infinity;
  for (const t of ts) { minX = Math.min(minX, t[0]); maxX = Math.max(maxX, t[0]); }
  hs.forEach((h, i) => {
    const t = ts[Math.min(ts.length - 1, Math.floor((i * ts.length) / hs.length))];
    h.tx = t[0]; h.ty = t[1];
    const mx = (h.x0 + h.tx) / 2, my = (h.y0 + h.ty) / 2, vx = h.tx - h.x0, vy = h.ty - h.y0;
    h.qx = mx - vy * C.glide.curve; h.qy = my + vx * C.glide.curve;
    h.delay = maxX > minX ? (C.glide.stagger * (h.tx - minX)) / (maxX - minX) : 0;
  });
  return true;
}

export function along(h, e) {
  const u = 1 - e;
  return [u * u * h.x0 + 2 * u * e * h.qx + e * e * h.tx, u * u * h.y0 + 2 * u * e * h.qy + e * e * h.ty];
}
