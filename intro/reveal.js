/* The reveal: particles thrown out by the bang converge onto the hero name and settle exactly on its letters.
   Targets come from the real page: each letter span of #h-name is drawn into an offscreen canvas at its on-screen
   box with its computed font, and lit pixels become targets. As the particles arrive the overlay fades out, so the
   real DOM letters (already in place underneath, not animated) take over with no jump or layout shift. */
import { program, buffer, attrib, hex } from "./renderer.js";

/* Lit pixels of the hero name, in CSS pixels relative to the viewport. step = sampling grid in CSS px. */
export function sampleGlyphs(max) {
  const h1 = document.getElementById("h-name");
  if (!h1) return { pts: [], step: 3, color: [1, 1, 1] };
  const chars = [...h1.querySelectorAll(".chi")];
  const W = innerWidth, H = innerHeight;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fff"; ctx.textBaseline = "alphabetic";
  let fs = 16;
  for (const ch of chars) {
    const cs = getComputedStyle(ch), r = ch.getBoundingClientRect();
    if (r.bottom < 0 || r.top > H) continue;
    fs = parseFloat(cs.fontSize);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = ctx.measureText(ch.textContent);
    const asc = m.fontBoundingBoxAscent ?? fs * 0.8, desc = m.fontBoundingBoxDescent ?? fs * 0.2;
    const lh = parseFloat(cs.lineHeight) || r.height;
    const baseline = r.top + (lh - (asc + desc)) / 2 + asc;     // half-leading model of an inline-block line box
    ctx.fillText(ch.textContent, r.left, baseline);
  }
  const step = Math.max(2, Math.round(fs / 34));
  const data = ctx.getImageData(0, 0, W, H).data, pts = [];
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (data[(y * W + x) * 4 + 3] > 140) pts.push(x, y);
  let out = pts;
  const n = pts.length / 2;
  if (n > max) {                                                   // keep an even random subset
    out = []; const keep = max / n;
    for (let i = 0; i < n; i++) if (Math.random() < keep) out.push(pts[i * 2], pts[i * 2 + 1]);
  }
  const col = getComputedStyle(h1).color.match(/\d+(\.\d+)?/g) || [255, 255, 255];
  return { pts: out, step: step * (n > max ? Math.sqrt(n / max) : 1), color: col.slice(0, 3).map((v) => +v / 255) };
}

const VS = `precision highp float;
attribute vec2 aStart, aTarget; attribute float aSeed;
uniform vec2 uRes; uniform float uP, uSize, uDpr, uTime;
varying float vA;
void main(){
  float k = clamp((uP - aSeed * 0.3) / 0.62, 0.0, 1.0);
  float e = 1.0 - pow(1.0 - k, 3.0);
  vec2 wob = (1.0 - e) * 0.05 * vec2(sin(uTime * 2.0 + aSeed * 40.0), cos(uTime * 1.7 + aSeed * 31.0));
  vec2 p = mix(aStart, aTarget, e) + wob;
  vA = smoothstep(0.0, 0.12, uP) * (1.0 - smoothstep(0.88, 1.0, uP));
  gl_PointSize = uSize * uDpr * (1.0 + 1.5 * (1.0 - e));
  gl_Position = vec4(p, 0.0, 1.0);
}`;
const FS = `precision mediump float;
uniform vec3 uInk, uGlow; uniform float uMix;
varying float vA;
void main(){
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.55, 1.0, r)) * vA;
  vec3 c = mix(uGlow, uInk, uMix);
  gl_FragColor = vec4(c * a, a);
}`;

export function revealer(gl, colors, sample) {
  const prog = program(gl, VS, FS);
  const W = innerWidth, H = innerHeight, n = sample.pts.length / 2;
  const start = new Float32Array(n * 2), target = new Float32Array(n * 2), seed = new Float32Array(n);
  const asp = W / H;
  for (let i = 0; i < n; i++) {
    target[i * 2] = (sample.pts[i * 2] / W) * 2 - 1;
    target[i * 2 + 1] = 1 - (sample.pts[i * 2 + 1] / H) * 2;
    const a = Math.random() * Math.PI * 2, r = 0.15 + Math.random() * 1.3;
    start[i * 2] = (Math.cos(a) * r) / asp; start[i * 2 + 1] = Math.sin(a) * r;
    seed[i] = Math.random();
  }
  const bS = buffer(gl, start), bT = buffer(gl, target), bD = buffer(gl, seed);
  return (st, p) => {
    gl.useProgram(prog.p);
    attrib(gl, prog, "aStart", bS, 2); attrib(gl, prog, "aTarget", bT, 2); attrib(gl, prog, "aSeed", bD, 1);
    gl.uniform2f(prog.u.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(prog.u.uP, p); gl.uniform1f(prog.u.uSize, sample.step * 1.25); gl.uniform1f(prog.u.uDpr, st.dpr); gl.uniform1f(prog.u.uTime, st.time);
    gl.uniform3fv(prog.u.uInk, sample.color); gl.uniform3fv(prog.u.uGlow, hex(colors.corona));
    gl.uniform1f(prog.u.uMix, Math.min(1, Math.max(0, (p - 0.35) / 0.45)));
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.POINTS, 0, n);
  };
}
