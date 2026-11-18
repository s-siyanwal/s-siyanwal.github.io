/* 2D-canvas fallback when WebGL is unavailable: the same piece from the same numbers. Wavefronts are stroked arcs;
   during the collapse they fade while the hits appear at their crossings. Only the cursor's pull is left out. */
import { envelope } from "./timeline.js";

export function canvas2d(canvas, pal) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  return {
    kind: "2d",
    draw(s) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      const g = s.g, lineA = s.waveA * (1 - sm(0, 0.8, s.c));
      if (lineA > 0.003 && s.front > 0) {
        ctx.lineWidth = s.hair; ctx.strokeStyle = pal.ink;
        for (const sx of [-s.half, s.half]) {
          for (let k = 0; k < g.K; k++) {
            const r = s.front - k * g.lam;
            if (r <= 0) break;
            const a = envelope(k, r, g) * lineA;
            if (a < 0.004) continue;
            ctx.globalAlpha = Math.min(1, a);
            ctx.beginPath(); ctx.arc(g.cx + sx, g.cy, r, 0, Math.PI * 2); ctx.stroke();
          }
        }
      }
      if (s.acc > 0.003 && s.front > 0) {
        const gr = ctx.createLinearGradient(0, g.cy - s.front, 0, g.cy + s.front);
        gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.225, pal.accent); gr.addColorStop(0.775, pal.accent); gr.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = Math.min(1, s.acc); ctx.strokeStyle = gr; ctx.lineWidth = s.hair;
        ctx.beginPath(); ctx.moveTo(g.cx, g.cy - s.front); ctx.lineTo(g.cx, g.cy + s.front); ctx.stroke();
      }
      if (s.nLn) {
        ctx.strokeStyle = pal.ink; ctx.lineWidth = 0.6;
        for (let i = 0; i < s.nLn; i += 2) {
          const o = i * 3;
          ctx.globalAlpha = Math.min(1, (s.ln[o + 2] + s.ln[o + 5]) * 0.5);
          ctx.beginPath(); ctx.moveTo(s.ln[o], s.ln[o + 1]); ctx.lineTo(s.ln[o + 3], s.ln[o + 4]); ctx.stroke();
        }
      }
      ctx.fillStyle = pal.ink;
      for (let i = 0; i < s.nPt; i++) {
        const q = i * 5, x = s.pt[q], y = s.pt[q + 1], a = s.pt[q + 2], size = s.pt[q + 3];
        if (a < 0.004) continue;
        if (s.pt[q + 4] > 0.5) {
          const gr = ctx.createRadialGradient(x, y, 0, x, y, size * 0.5);
          gr.addColorStop(0, pal.ink); gr.addColorStop(1, "rgba(0,0,0,0)");
          ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(x, y, size * 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = pal.ink;
        } else {
          ctx.globalAlpha = Math.min(1, a);
          ctx.beginPath(); ctx.arc(x, y, size * 0.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
    lost: () => {},
    destroy() {},
  };
}
