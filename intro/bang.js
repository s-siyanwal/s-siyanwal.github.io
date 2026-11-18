/* The bang's vibrating strings: line segments thrown outward from the centre, oscillating with a damped standing
   wave as they fly (energy filaments). The flash and shockwave rings are in the background pass (renderer.js),
   the particle burst in fields.js; all of them read the same bang clock, so the eruption is one layered event. */
import { program, buffer, attrib, hex } from "./renderer.js";

const VS = `precision highp float;
attribute float aU; attribute vec2 aS;
uniform vec2 uRes; uniform float uBang, uBangLen, uFade;
varying float vA;
void main(){
  float asp = uRes.x / uRes.y;
  float s = uBang / 1000.0 * (1500.0 / uBangLen);
  float ang = aS.x * 6.2831853;
  vec2 dir = vec2(cos(ang), sin(ang)), perp = vec2(-dir.y, dir.x);
  float len = (0.5 + 1.6 * aS.y) * (1.0 - exp(-2.4 * s));
  float amp = 0.07 * exp(-1.8 * s) * sin(3.14159 * aU);
  vec2 p = dir * (0.05 + len * aU) + perp * amp * sin(aU * 18.0 - s * 26.0 + aS.y * 9.0);
  vA = (1.0 - 0.6 * aU) * exp(-2.0 * s) * step(0.0, uBang) * uFade;
  gl_Position = vec4(p.x / asp, p.y, 0.0, 1.0);
}`;
const FS = `precision mediump float; uniform vec3 uCol; varying float vA; void main(){ gl_FragColor = vec4(uCol * vA, vA); }`;

export function filaments(gl, colors, strings = 48, segs = 28) {
  const prog = program(gl, VS, FS);
  const u = [], s = [];
  for (let k = 0; k < strings; k++) {
    const a = Math.random(), b = Math.random();
    for (let i = 0; i < segs; i++) { u.push(i / segs, (i + 1) / segs); s.push(a, b, a, b); }
  }
  const bU = buffer(gl, new Float32Array(u)), bS = buffer(gl, new Float32Array(s)), n = u.length;
  return (st) => {
    if (st.bang < 0) return;
    gl.useProgram(prog.p);
    attrib(gl, prog, "aU", bU, 1); attrib(gl, prog, "aS", bS, 2);
    gl.uniform2f(prog.u.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(prog.u.uBang, st.bang); gl.uniform1f(prog.u.uBangLen, st.bangLen); gl.uniform1f(prog.u.uFade, st.fade);
    gl.uniform3fv(prog.u.uCol, hex(colors.corona));
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArrays(gl.LINES, 0, n);
  };
}

export const easeOut = (t) => 1 - (1 - t) ** 3;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
