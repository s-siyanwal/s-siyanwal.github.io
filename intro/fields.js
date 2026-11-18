/* Matter and antimatter fields as GPU particles. Positions are computed entirely in the vertex shader from a
   per-particle seed and time (no CPU simulation): each set orbits the centre in the opposite sense, drifts on a
   noise flow field and is pushed away from the pointer. A slowly moving scalar field φ splits space into matter
   (φ > 0) and antimatter (φ < 0) domains that interpenetrate; sparks live only near the interface φ ≈ 0, where
   pairs annihilate and are created. Each particle drifts between a point (particle) and a ring (wave) look.
   Charging pulls everything inward and speeds it up; the bang throws it outward in three speed layers with drag. */
import { NOISE, program, buffer, attrib, hex } from "./renderer.js";

const VS = `precision highp float;
${NOISE}
attribute vec4 aSeed; attribute float aKind;
uniform vec2 uRes, uPtr; uniform float uTime, uEnergy, uKick, uBang, uBangLen, uDpr, uPtrOn, uFade;
varying float vAlpha, vKind, vRing;
void main(){
  float asp = uRes.x / uRes.y;
  float dir = aKind < 0.5 ? 1.0 : -1.0;
  float rad = mix(0.16, 1.45, sqrt(aSeed.y)) * (1.0 - 0.32 * uEnergy);
  float w = dir * (0.05 + 0.14 * aSeed.z) / (0.25 + rad) * (1.0 + 2.2 * uEnergy);
  float ang = aSeed.x * 6.2831853 + w * uTime;
  vec2 p = vec2(cos(ang), sin(ang)) * rad;
  p += 0.09 * vec2(snoise(p * 1.6 + vec2(uTime * 0.05, aSeed.w * 10.0)), snoise(p * 1.6 + vec2(13.7, uTime * 0.05)));
  vec2 dp = p - uPtr; float dl = length(dp);
  p += uPtrOn * (dp / (dl + 1e-4)) * 0.2 * exp(-dl * dl / 0.05);
  float phi = snoise(p * 1.25 + vec2(uTime * 0.04, -uTime * 0.03));
  float a;
  if (aKind < 0.5) a = smoothstep(-0.12, 0.25, phi);
  else if (aKind < 1.5) a = smoothstep(-0.12, 0.25, -phi);
  else a = exp(-phi * phi / 0.003) * smoothstep(0.0, 0.25, fract(uTime * (0.25 + aSeed.z * 0.4) + aSeed.w)) * (1.0 - smoothstep(0.3, 0.55, fract(uTime * (0.25 + aSeed.z * 0.4) + aSeed.w)));
  a *= 0.85 + 0.55 * uEnergy + 0.4 * uKick;
  vRing = aKind > 1.5 ? 0.0 : smoothstep(0.55, 0.95, sin(uTime * 0.45 + aSeed.x * 37.0));
  float size = mix(1.5, 3.2, aSeed.w) * mix(1.0, 4.2, vRing);
  a *= mix(1.0, 0.4, vRing);
  if (uBang >= 0.0) {
    float s = uBang / 1000.0 * (1500.0 / uBangLen);
    float layer = aSeed.z < 0.33 ? 0.7 : (aSeed.z < 0.66 ? 1.6 : 3.2);
    vec2 out1 = normalize(p + 1e-4 * vec2(cos(aSeed.x * 40.0), sin(aSeed.y * 40.0)));
    float drag = 1.8;
    p += out1 * layer * (0.6 + aSeed.y) * (1.0 - exp(-drag * s)) / drag;
    a = (aKind > 1.5 ? 1.0 : a + 0.6) * exp(-s * 1.4) * (aKind > 1.5 ? step(0.5, aSeed.w) : 1.0);
    size *= 1.0 + 0.6 * exp(-s * 3.0);
    vRing = 0.0;
  }
  vAlpha = a * uFade; vKind = aKind;
  gl_PointSize = size * uDpr;
  gl_Position = vec4(p.x / asp, p.y, 0.0, 1.0);
}`;

const FS = `precision mediump float;
uniform vec3 uColA, uColB, uSpark;
varying float vAlpha, vKind, vRing;
void main(){
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float dotS = 1.0 - smoothstep(0.0, 1.0, r);
  float ringS = 1.0 - smoothstep(0.0, 0.16, abs(r - 0.72));
  float shape = mix(dotS * dotS, ringS, vRing);
  vec3 c = vKind < 0.5 ? uColA : (vKind < 1.5 ? uColB : uSpark);
  float a = shape * vAlpha;
  gl_FragColor = vec4(c * a, a);
}`;

export function fields(gl, colors, count) {
  const prog = program(gl, VS, FS);
  const seeds = new Float32Array(count * 4), kinds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 4; k++) seeds[i * 4 + k] = Math.random();
    const r = Math.random();
    kinds[i] = r < 0.45 ? 0 : r < 0.9 ? 1 : 2;
  }
  const bSeed = buffer(gl, seeds), bKind = buffer(gl, kinds);
  let drawCount = count;
  const draw = (st) => {
    gl.useProgram(prog.p);
    attrib(gl, prog, "aSeed", bSeed, 4); attrib(gl, prog, "aKind", bKind, 1);
    gl.uniform2f(prog.u.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform2f(prog.u.uPtr, st.ptr[0], st.ptr[1]); gl.uniform1f(prog.u.uPtrOn, st.ptrOn);
    gl.uniform1f(prog.u.uTime, st.time); gl.uniform1f(prog.u.uEnergy, st.energy); gl.uniform1f(prog.u.uKick, st.kick);
    gl.uniform1f(prog.u.uBang, st.bang); gl.uniform1f(prog.u.uBangLen, st.bangLen); gl.uniform1f(prog.u.uDpr, st.dpr); gl.uniform1f(prog.u.uFade, st.fade);
    gl.uniform3fv(prog.u.uColA, hex(colors.matter)); gl.uniform3fv(prog.u.uColB, hex(colors.antimatter)); gl.uniform3fv(prog.u.uSpark, hex(colors.spark));
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, drawCount);
  };
  draw.reduce = (f) => { drawCount = Math.max(1000, Math.floor(drawCount * f)); };
  return draw;
}
