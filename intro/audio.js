/* Optional sound, off by default: one low, soft tone at the collapse and nothing else. The visitor turns it on with
   the "Intro sound" control next to "Replay intro"; the choice is kept in localStorage("intro-sound"). WebAudio, no
   files. Browsers only allow sound after an interaction, so a first visit stays silent; a replay can play it. */
import { CONFIG } from "./config.js";

export const SOUND_KEY = "intro-sound";

export function soundOn() {
  try { const v = localStorage.getItem(SOUND_KEY); if (v === "on" || v === "off") return v === "on"; } catch (e) { /* blocked */ }
  return CONFIG.sound.default;
}

export function tone() {
  if (!soundOn()) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  let ctx;
  try { ctx = new AC(); } catch (e) { return; }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const S = CONFIG.sound, t = ctx.currentTime + 0.02;
  const out = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = S.freq * 5;
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(S.gain, t + S.attack);
  out.gain.setTargetAtTime(0, t + S.attack, S.release / 4);
  lp.connect(out); out.connect(ctx.destination);
  [[1, 1], [2, 0.18]].forEach(([m, g]) => {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = "sine"; o.frequency.value = S.freq * m; og.gain.value = g;
    o.connect(og); og.connect(lp); o.start(t); o.stop(t + S.attack + S.release + 0.4);
  });
  setTimeout(() => ctx.close().catch(() => {}), (S.attack + S.release + 0.8) * 1000);
}
