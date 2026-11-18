/* Optional sound for the intro, off by default. Nothing is created or played until the visitor turns it on with the
   speaker toggle; the choice is remembered in localStorage("intro-sound"). A low hum rises with each click and a
   soft, deep bloom marks the bang. All WebAudio, no files. */
const KEY = "intro-sound";

export function createAudio(defaultOn = false) {
  let on = defaultOn;
  try { const v = localStorage.getItem(KEY); if (v === "on" || v === "off") on = v === "on"; } catch (e) { /* storage blocked */ }
  let ctx = null, master = null, hum = null, energy = 0;

  const ensure = () => {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420; lp.connect(master);
    const g = ctx.createGain(); g.gain.value = 0.5; g.connect(lp);
    hum = [55, 82.4, 110].map((f, i) => { const o = ctx.createOscillator(); o.type = i ? "sine" : "triangle"; o.frequency.value = f; o.connect(g); o.start(); return o; });
  };
  const level = () => (on ? 0.02 + 0.09 * energy : 0);
  const apply = () => { if (master) master.gain.setTargetAtTime(level(), ctx.currentTime, 0.25); };

  return {
    get on() { return on; },
    toggle() {
      on = !on;
      try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) { /* blocked */ }
      if (on) { ensure(); if (ctx && ctx.state === "suspended") ctx.resume(); }
      apply();
      return on;
    },
    resumeIfOn() { if (on) { ensure(); if (ctx && ctx.state === "suspended") ctx.resume(); apply(); } },
    setEnergy(e) {
      energy = e;
      if (!ctx) return;
      hum.forEach((o, i) => o.frequency.setTargetAtTime([55, 82.4, 110][i] * (1 + 0.35 * e), ctx.currentTime, 0.3));
      apply();
    },
    bloom() {
      if (!ctx || !on) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(96, t); o.frequency.exponentialRampToValueAtTime(28, t + 2.6);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 3.3);
      const n = ctx.createBufferSource(), buf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
      const nf = ctx.createBiquadFilter(), ng = ctx.createGain();
      nf.type = "lowpass"; nf.frequency.value = 300; ng.gain.value = 0.18;
      n.buffer = buf; n.connect(nf); nf.connect(ng); ng.connect(ctx.destination); n.start(t);
      if (master) master.gain.setTargetAtTime(0, t + 0.2, 0.6);
    },
    stop() {
      if (!ctx) return;
      const c = ctx; master.gain.setTargetAtTime(0, c.currentTime, 0.3);
      setTimeout(() => c.close().catch(() => {}), 3500);
      ctx = null;
    },
  };
}
