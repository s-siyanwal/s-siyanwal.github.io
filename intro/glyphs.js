/* Target points on the hero name. Each letter span of #h-name is drawn into a small offscreen canvas at its
   on-screen box with its computed font (the site's own typeface), and an evenly spread subset of the lit pixels
   becomes the landing points. The real DOM letters stay where they are; the overlay hands over to them. */
export function glyphTargets(n) {
  const h1 = document.getElementById("h-name");
  const chars = h1 ? [...h1.querySelectorAll(".chi")] : [];
  if (!chars.length || n <= 0) return null;
  const box = h1.getBoundingClientRect();
  if (box.width < 4 || box.bottom < 0 || box.top > innerHeight) return null;
  const pad = 12, ox = Math.floor(box.left) - pad, oy = Math.floor(box.top) - pad;
  const w = Math.ceil(box.width) + 2 * pad, h = Math.ceil(box.height) + 2 * pad + 60;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = "#fff"; ctx.textBaseline = "alphabetic";
  let fs = 16;
  for (const ch of chars) {
    const cs = getComputedStyle(ch), r = ch.getBoundingClientRect();
    fs = parseFloat(cs.fontSize) || fs;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = ctx.measureText(ch.textContent);
    const asc = m.fontBoundingBoxAscent ?? fs * 0.8, desc = m.fontBoundingBoxDescent ?? fs * 0.2;
    const lh = parseFloat(cs.lineHeight) || r.height;
    ctx.fillText(ch.textContent, r.left - ox, r.top - oy + (lh - (asc + desc)) / 2 + asc); // half-leading line box
  }
  const step = Math.max(1, Math.round(fs / 70));
  const data = ctx.getImageData(0, 0, w, h).data, lit = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (data[(y * w + x) * 4 + 3] > 150) lit.push(x + ox, y + oy);
  const m = lit.length / 2;
  if (!m) return null;
  // Even spread (dart throwing on a grid): shuffle the lit pixels, keep each one that has no kept neighbour within r.
  let seed = 7;
  const order = [...Array(m).keys()];
  for (let i = m - 1; i > 0; i--) { seed = (seed * 16807) % 2147483647; const j = seed % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }
  let r = Math.sqrt((m * step * step) / n) * 0.95, best = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    const cell = r, grid = new Map(), kept = [];
    const k = (gx, gy) => gx * 73856093 ^ gy * 19349663;
    for (const i of order) {
      const x = lit[i * 2], y = lit[i * 2 + 1], gx = Math.floor(x / cell), gy = Math.floor(y / cell);
      let ok = true;
      for (let dx = -1; dx <= 1 && ok; dx++) for (let dy = -1; dy <= 1 && ok; dy++) {
        const b = grid.get(k(gx + dx, gy + dy));
        if (b) for (const p of b) if ((p[0] - x) ** 2 + (p[1] - y) ** 2 < r * r) { ok = false; break; }
      }
      if (!ok) continue;
      const key = k(gx, gy);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push([x, y]); kept.push([x, y]);
      if (kept.length >= n) break;
    }
    if (kept.length > best.length) best = kept;
    if (kept.length >= n * 0.92) break;
    r *= 0.86;
  }
  return best;
}
