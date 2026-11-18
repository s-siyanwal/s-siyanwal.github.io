/* 2D-canvas fallback when WebGL is unavailable: the same story in a simpler drawing (vacuum, wobbling eclipse with a
   corona, two drifting particle sets, a flash with rings and a burst). The reveal is a plain fade to the page. */
export function fallback2d(canvas, colors, count) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const P = [...Array(count)].map(() => ({ a: Math.random() * Math.PI * 2, r: 0.18 + Math.random() * 1.2, w: (0.05 + Math.random() * 0.12) * (Math.random() < 0.5 ? 1 : -1), s: 0.6 + Math.random() * 2.6 }));
  return (st) => {
    const W = canvas.width, H = canvas.height, R = H / 2, cx = W / 2, cy = H / 2;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = st.fade;
    ctx.fillStyle = colors.vacuum; ctx.fillRect(0, 0, W, H);
    const t = st.bang < 0 ? 0 : st.bang / st.bangLen, alive = st.bang < 0 ? 1 : Math.exp(-t * 9);
    const e = st.energy + 0.6 * st.kick;
    const rad = (0.075 + 0.055 * st.energy) * R * (1 + (0.07 + 0.16 * e) * Math.sin(st.time * (2 + 4 * e))) * alive;
    if (alive > 0.01) {
      const g = ctx.createRadialGradient(cx, cy, rad, cx, cy, rad * (2.2 + 2 * e));
      g.addColorStop(0, colors.corona); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rad * (2.2 + 2 * e), 0, 7); ctx.fill();
      ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = "lighter";
    P.forEach((p, i) => {
      const ang = p.a + p.w * st.time * (1 + 2 * st.energy);
      let r = p.r * (1 - 0.32 * st.energy);
      if (st.bang >= 0) r += p.s * (1 - Math.exp(-1.8 * t * 1.5)) / 1.8;
      const x = cx + Math.cos(ang) * r * R, y = cy + Math.sin(ang) * r * R;
      ctx.fillStyle = i % 2 ? colors.antimatter : colors.matter;
      ctx.globalAlpha = st.fade * (st.bang >= 0 ? Math.exp(-t * 2) : 0.35 + 0.5 * st.energy);
      ctx.fillRect(x, y, 2, 2);
    });
    if (st.bang >= 0) {
      const flash = Math.exp(-(((t - 0.08) / 0.075) ** 2));
      ctx.globalAlpha = st.fade * flash * 0.85; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      for (let k = 0; k < 3; k++) {
        ctx.globalAlpha = st.fade * Math.exp(-t * 2.2) * 0.8;
        ctx.strokeStyle = k === 1 ? colors.antimatter : colors.matter; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, (t * 1.5) * (1.25 + 0.75 * k) * R, 0, 7); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };
}
