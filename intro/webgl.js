/* WebGL renderer. One full-screen pass draws the wave: two families of hairline wavefronts with analytic
   anti-aliasing, the accent hairline on the symmetry axis, and the cursor's gentle pull. During the collapse the
   pass keeps only the crossings of the two families, so the lines contract onto the detector hits. A second pass
   draws the points (hits, the first point of light) and their short motion-blur trails.
   Output is premultiplied over a transparent canvas, so the same code draws light on black or ink on paper. */
const HEAD = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n";

const WAVE_VS = "attribute vec2 aP; void main(){ gl_Position = vec4(aP, 0.0, 1.0); }";
const WAVE_FS = HEAD + `
uniform vec2 uC, uPtr;
uniform float uS, uR, uLam, uW, uK, uDec, uA, uX, uBend, uBR, uAcc;
uniform vec3 uInk, uAccC;
float ring(float d){
  float x = (uR - d) / uLam;                                   // wavefront index, 0 at the front
  if (x < -(uW + 1.0) / uLam) return 0.0;
  float f = abs(fract(x + 0.5) - 0.5) * uLam;                  // pixels to the nearest wavefront
  float cov = 1.0 - smoothstep(uW - 0.5, uW + 0.5, f);
  return cov * exp(-max(x, 0.0) * uDec) * (1.0 - smoothstep(uK - 3.0, uK, x)) * smoothstep(0.0, 2.5 * uLam, d);
}
void main(){
  vec2 p = gl_FragCoord.xy;
  if (uBend > 0.0) { vec2 q = p - uPtr; float qq = dot(q, q); p += q * inversesqrt(qq + 1.0) * uBend * exp(-qq / (uBR * uBR)); }
  float la = ring(length(p - uC + vec2(uS, 0.0)));
  float lb = ring(length(p - uC - vec2(uS, 0.0)));
  float lines = la + lb - la * lb;
  float cross = min(1.0, la * lb * 2.2);
  float I = mix(lines, cross, smoothstep(0.0, 0.75, uX)) * (1.0 - smoothstep(0.55, 1.0, uX)) * uA;
  float acc = (1.0 - smoothstep(uW - 0.5, uW + 0.5, abs(p.x - uC.x))) * (1.0 - smoothstep(0.55 * uR, uR, abs(p.y - uC.y))) * uAcc;
  gl_FragColor = vec4(uInk * I + uAccC * acc, min(1.0, I + acc));
}`;

const PT_VS = `attribute vec2 aP; attribute vec3 aD; uniform vec2 uRes; varying vec3 vD;
void main(){ vD = aD; gl_PointSize = aD.y + 2.0; gl_Position = vec4(aP.x / uRes.x * 2.0 - 1.0, 1.0 - aP.y / uRes.y * 2.0, 0.0, 1.0); }`;
const PT_FS = HEAD + `uniform vec3 uInk; uniform float uPt; varying vec3 vD;
void main(){
  float a = vD.x;
  if (uPt > 0.5) {
    float s = vD.y + 2.0, d = length(gl_PointCoord - 0.5) * s;
    a *= vD.z > 0.5 ? exp(-d * d / (0.045 * s * s)) : clamp(vD.y * 0.5 + 0.5 - d, 0.0, 1.0);
  }
  gl_FragColor = vec4(uInk * a, a);
}`;

const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

function program(gl, vs, fs) {
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
  return { p, u, a: (name) => gl.getAttribLocation(p, name) };
}

export function webgl(canvas, pal, maxPts) {
  let gl = null;
  try { gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false }); } catch (e) { gl = null; }
  if (!gl) return null;
  let wave, pts;
  try { wave = program(gl, WAVE_VS, WAVE_FS); pts = program(gl, PT_VS, PT_FS); } catch (e) { console.warn("intro: shader setup failed, using 2D", e); return null; }
  const tri = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tri); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const ptBuf = gl.createBuffer(), lnBuf = gl.createBuffer();
  const ptData = new Float32Array((maxPts + 2) * 5), lnData = new Float32Array(maxPts * 2 * 5);
  const ink = rgb(pal.ink), accent = rgb(pal.accent);
  const aWave = wave.a("aP"), aP = pts.a("aP"), aD = pts.a("aD");

  const drawPts = (buf, data, count, mode, isPt) => {
    if (!count) return;
    gl.useProgram(pts.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count * 5), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(aD); gl.vertexAttribPointer(aD, 3, gl.FLOAT, false, 20, 8);
    gl.uniform2f(pts.u.uRes, canvas.width, canvas.height); gl.uniform3fv(pts.u.uInk, ink); gl.uniform1f(pts.u.uPt, isPt ? 1 : 0);
    gl.drawArrays(mode, 0, count);
  };

  return {
    kind: "webgl",
    draw(s) {
      const d = s.dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      if (s.waveA > 0.002 || s.acc > 0.002) {
        const u = wave.u;
        gl.useProgram(wave.p);
        gl.bindBuffer(gl.ARRAY_BUFFER, tri); gl.enableVertexAttribArray(aWave); gl.vertexAttribPointer(aWave, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(u.uC, s.g.cx * d, canvas.height - s.g.cy * d);
        gl.uniform2f(u.uPtr, s.ptrX * d, canvas.height - s.ptrY * d);
        gl.uniform1f(u.uS, s.half * d); gl.uniform1f(u.uR, s.front * d); gl.uniform1f(u.uLam, s.g.lam * d);
        gl.uniform1f(u.uW, s.hair * d * 0.5); gl.uniform1f(u.uK, s.g.K); gl.uniform1f(u.uDec, s.decay);
        gl.uniform1f(u.uA, s.waveA); gl.uniform1f(u.uX, s.c); gl.uniform1f(u.uBend, s.bend * d); gl.uniform1f(u.uBR, s.bendR * d);
        gl.uniform1f(u.uAcc, s.acc); gl.uniform3fv(u.uInk, ink); gl.uniform3fv(u.uAccC, accent);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.disableVertexAttribArray(aWave);
      }
      if (s.nLn) {                                                     // trails first, points on top
        for (let i = 0; i < s.nLn; i++) { const o = i * 3, q = i * 5; lnData[q] = s.ln[o] * d; lnData[q + 1] = s.ln[o + 1] * d; lnData[q + 2] = s.ln[o + 2]; lnData[q + 3] = 1; lnData[q + 4] = 0; }
        drawPts(lnBuf, lnData, s.nLn, gl.LINES, false);
      }
      if (s.nPt) {
        for (let i = 0; i < s.nPt; i++) { const q = i * 5; ptData[q] = s.pt[q] * d; ptData[q + 1] = s.pt[q + 1] * d; ptData[q + 2] = s.pt[q + 2]; ptData[q + 3] = s.pt[q + 3] * d; ptData[q + 4] = s.pt[q + 4]; }
        drawPts(ptBuf, ptData, s.nPt, gl.POINTS, true);
      }
      gl.disableVertexAttribArray(aP); gl.disableVertexAttribArray(aD);
    },
    lost: (fn) => canvas.addEventListener("webglcontextlost", fn),
    destroy() { const ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); gl = null; },
  };
}
