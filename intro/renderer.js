/* WebGL renderer for the Big Bang intro: context, program helpers, a shared noise chunk and the background pass
   (quantum vacuum, the unstable eclipse at the centre, the flash and the shockwave rings).
   Coordinates: "q-space" has the centre at (0, 0), y in [-1, 1] and x scaled by the aspect ratio. Colours are
   premultiplied; the canvas is composited over the page, so fading uFade to 0 reveals the page underneath. */

export const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0); m=m*m; m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 ox=floor(x+0.5); vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*snoise(p); p*=2.03; a*=0.5; } return s; }
`;

const HEAD = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n";

const BG_VS = "attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }";
const BG_FS = HEAD + NOISE + `
uniform vec2 uRes; uniform float uTime, uEnergy, uKick, uBang, uFade, uBangLen;
uniform vec3 uVac, uTint, uColA, uColB, uCorona;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec2 q = (gl_FragCoord.xy - 0.5*uRes) / (0.5*uRes.y);
  float d = length(q), ang = atan(q.y, q.x);
  // Quantum vacuum: near-black with the accent blended in, slow low-contrast fluctuation.
  vec3 col = mix(uVac, uTint, 0.05);
  col += uTint * 0.035 * (snoise(q*2.4 + vec2(uTime*0.035, -uTime*0.02)) * 0.6 + snoise(q*7.0 - uTime*0.06) * 0.4);
  // Virtual particles: tiny points that flicker in and out, slowly and faintly.
  vec2 g = q * 22.0; vec2 cell = floor(g);
  float life = fract(uTime * 0.23 + hash(cell) * 7.0);
  float pop = step(0.965, hash(cell + 3.1)) * smoothstep(0.0, 0.3, life) * (1.0 - smoothstep(0.6, 1.0, life));
  col += uTint * 0.16 * pop * (1.0 - smoothstep(0.0, 0.09, length(fract(g) - 0.5 - (vec2(hash(cell+1.7), hash(cell+9.2)) - 0.5) * 0.5)));
  // The unstable centre: a dark core with an irregular corona; energy makes it wobble, swell and brighten.
  float t = uBang < 0.0 ? 0.0 : uBang / uBangLen;
  float alive = uBang < 0.0 ? 1.0 : exp(-t * 9.0);
  float e = uEnergy + 0.6 * uKick;
  float wob = fbm(vec2(cos(ang) * 1.6 + uTime * (0.45 + 1.4 * e), sin(ang) * 1.6 - uTime * 0.3));
  float r = (0.075 + 0.055 * uEnergy) * (1.0 + (0.07 + 0.16 * e) * wob) * alive;
  vec3 rr = r + vec3(0.0045, 0.0, -0.0045) * (e * 1.2);                    // chromatic fringing under tension
  float w = 0.028 + 0.06 * e;
  float rays = 0.55 + 0.45 * fbm(vec2(ang * 5.0, uTime * 0.35 - d * 2.5));
  vec3 halo = vec3(exp(-max(d - rr.r, 0.0) / w), exp(-max(d - rr.g, 0.0) / w), exp(-max(d - rr.b, 0.0) / w));
  col += uCorona * halo * rays * (0.55 + 1.5 * e) * alive * step(rr, vec3(d));
  col *= 1.0 - (1.0 - smoothstep(r - 0.004, r + 0.004, d)) * alive;                // the dark core
  // The bang: one smooth flash (white → accent), then three distorted shockwave rings.
  if (uBang >= 0.0) {
    float s = uBang / 1000.0;
    float flash = exp(-pow((t - 0.08) / 0.075, 2.0));
    col += mix(vec3(1.0), uColA, smoothstep(0.02, 0.25, t)) * flash * (0.6 + 0.9 * exp(-d * 0.9));
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float R = s * (1.25 + 0.75 * fk) / (uBangLen / 1500.0);
      float wd = 0.012 + 0.05 * t;
      float ring = exp(-pow((d - R - 0.035 * snoise(vec2(ang * 3.0 + fk, s * 2.0))) / wd, 2.0));
      col += mix(uColA, uColB, fk * 0.5) * ring * 0.8 * exp(-t * 2.2);
    }
  }
  gl_FragColor = vec4(col * uFade, uFade);
}`;

export function createGL(canvas) {
  const opts = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" };
  const gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
  return gl || null;
}

export function program(gl, vs, fs) {
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader compile failed");
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link failed");
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(p, info.name); }
  return { p, u, a: (name) => gl.getAttribLocation(p, name) };
}

export function buffer(gl, data) {
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b;
}

export function attrib(gl, prog, name, buf, size) {
  const loc = prog.a(name);
  if (loc < 0) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
}

export const hex = (h) => { const s = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255); };

export function background(gl, colors) {
  const prog = program(gl, BG_VS, BG_FS);
  const quad = buffer(gl, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]));
  return (st) => {
    gl.useProgram(prog.p);
    attrib(gl, prog, "aPos", quad, 2);
    gl.uniform2f(prog.u.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(prog.u.uTime, st.time); gl.uniform1f(prog.u.uEnergy, st.energy); gl.uniform1f(prog.u.uKick, st.kick);
    gl.uniform1f(prog.u.uBang, st.bang); gl.uniform1f(prog.u.uBangLen, st.bangLen); gl.uniform1f(prog.u.uFade, st.fade);
    gl.uniform3fv(prog.u.uVac, hex(colors.vacuum)); gl.uniform3fv(prog.u.uTint, hex(colors.tint));
    gl.uniform3fv(prog.u.uColA, hex(colors.matter)); gl.uniform3fv(prog.u.uColB, hex(colors.antimatter)); gl.uniform3fv(prog.u.uCorona, hex(colors.corona));
    gl.disable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
}
