/* Site background, rendered with three.js: one full-screen shader with a physics "mode" per page.
     0  wave interference   ψ = Σ ψ_i, contour lines of |ψ|² coloured by arg ψ     (home, about, papers, path)
     1  flow past a cylinder streamlines of a uniform flow + a drifting vortex street     (TensNet)
     2  spin precession     free-induction rings, phase = ω t − k r, decaying envelope    (NMR entanglement)
     3  encoded lattice     a pixel grid whose cell amplitudes follow a smooth "image"    (image encodings, VQLS)
     4  isobars             contours of drifting highs and lows                           (weather QML / FPGA)
     5  pulse trains        photon pulses travelling along fibres                        (QKD, cryptography)
   The pointer perturbs every mode (a source, a vortex, a local field, a low...) with a strength that follows
   pointer speed; scroll velocity (from Lenis) shears the phase. Decorative: aria-hidden, pausable, stops in
   hidden tabs, never rendered under reduced motion or while prerendering (core.js decides). */
import * as THREE from "./vendor/three.module.min.js";

const VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uMode; uniform vec2 uPtr; uniform float uPtrAmp;
uniform float uScroll; uniform float uVel; uniform vec3 uColA; uniform vec3 uColB; uniform float uAlpha;
#define PI 3.14159265

float band(float v, float n){ float c = v * n; float f = fract(c); float d = min(f, 1.0 - f); return 1.0 - smoothstep(0.0, fwidth(c) * 1.3, d); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec4 interference(vec2 q, float asp){
  float k = 2.0 * PI / 0.055;
  vec2 S[4]; S[0] = vec2(0.82*asp, 0.74); S[1] = vec2(0.12*asp, 0.22); S[2] = vec2(0.52*asp, 0.04); S[3] = vec2(0.96*asp, 0.30);
  float W[4]; W[0] = 1.0; W[1] = smoothstep(0.04, 0.2, uScroll); W[2] = smoothstep(0.3, 0.5, uScroll); W[3] = smoothstep(0.55, 0.75, uScroll);
  vec2 z = vec2(0.0); float n = 0.0001;
  for (int i = 0; i < 4; i++){ float d = distance(q, S[i]); float ph = k*d - uTime*1.6 + uVel*d*0.8; z += W[i]*vec2(cos(ph), sin(ph))*inversesqrt(1.0 + d*k*0.08); n += W[i]; }
  float dp = distance(q, uPtr); float pp = k*dp - uTime*2.7; z += uPtrAmp*vec2(cos(pp), sin(pp))*inversesqrt(1.0 + dp*k*0.08); n += uPtrAmp;
  float I = dot(z, z) / (n*n);
  float line = band(sqrt(I), 7.0);
  float a = 0.25*min(I*2.0, 1.0) + 0.75*line*min(I*4.0, 1.0);
  return vec4(mix(uColA, uColB, 0.5 + 0.5*cos(atan(z.y, z.x))), a);
}

vec4 flow(vec2 q, float asp){
  vec2 c = vec2(0.28*asp, 0.5); float R = 0.075; vec2 r = q - c; float r2 = max(dot(r, r), 1e-4);
  float psi = (r.y) * (1.0 - R*R / r2);                       // uniform flow past a cylinder
  for (int i = 0; i < 6; i++){                                   // alternating vortices drifting downstream
    float fi = float(i); float x = c.x + 0.14 + mod(uTime*0.05 + fi*0.17, 1.05*asp);
    float y = c.y + (mod(fi, 2.0) < 0.5 ? 0.07 : -0.07);
    float s = mod(fi, 2.0) < 0.5 ? 1.0 : -1.0; vec2 v = q - vec2(x, y);
    psi += s * 0.022 * log(dot(v, v) + 0.0009) * smoothstep(0.0, 0.25, x - c.x);
  }
  vec2 vp = q - uPtr; psi += uPtrAmp * 0.03 * log(dot(vp, vp) + 0.001);
  psi += uVel * 0.02 * q.x;
  float line = band(psi, 26.0);
  float inside = smoothstep(R, R + 0.004, sqrt(r2));
  return vec4(mix(uColA, uColB, smoothstep(-0.3, 0.3, psi)), (0.9*line + 0.05) * inside);
}

vec4 spin(vec2 q, float asp){
  vec2 c = vec2(0.72*asp, 0.55); float d = distance(q, c);
  float field = 0.25 * uPtrAmp / (1.0 + 60.0*dot(q - uPtr, q - uPtr));     // local field offset under the pointer
  float ph = uTime*1.4 - d*58.0 + field*40.0 + uVel*q.y*3.0 + 2.0*q.x;
  float env = exp(-d*1.25) * (0.75 + 0.25*cos(uTime*0.3));
  float m = cos(ph);
  float line = band(0.5 + 0.5*m, 2.0) * env;
  return vec4(mix(uColA, uColB, 0.5 + 0.5*sin(ph*0.5)), line + 0.1*env);
}

vec4 lattice(vec2 q, float asp, vec2 px){
  float cell = 34.0; vec2 g = floor(px / cell); vec2 f = fract(px / cell) - 0.5;
  vec2 gc = (g + 0.5) * cell / uRes.y;                              // cell centre in q units
  float img = 0.5 + 0.25*sin(gc.x*7.0 + uTime*0.4) + 0.25*cos(gc.y*9.0 - gc.x*3.0 - uTime*0.3);
  img += uPtrAmp * 0.6 * exp(-30.0*dot(gc - uPtr, gc - uPtr));
  img += uVel*0.05*sin(gc.y*20.0);
  float theta = clamp(img, 0.0, 1.0) * PI * 0.5;                    // amplitude-encoding angle per pixel
  float s = 0.08 + 0.34*sin(theta);
  float box = step(abs(f.x), s) * step(abs(f.y), s);
  float edge = (1.0 - smoothstep(0.0, 0.04, abs(abs(f.x) - 0.5))) + (1.0 - smoothstep(0.0, 0.04, abs(abs(f.y) - 0.5)));
  return vec4(mix(uColA, uColB, cos(theta)), 0.36*box + 0.2*min(edge, 1.0));
}

vec4 isobars(vec2 q, float asp){
  float p = 0.0;
  for (int i = 0; i < 5; i++){
    float fi = float(i);
    vec2 c = vec2(mod(0.15 + fi*0.31*asp + uTime*0.012*(1.0 + fi*0.2), 1.2*asp) - 0.1, 0.5 + 0.35*sin(fi*1.7 + uTime*0.05));
    float s = mod(fi, 2.0) < 0.5 ? 1.0 : -1.0;
    p += s * exp(-dot(q - c, q - c) * 6.0);
  }
  p -= uPtrAmp * 0.8 * exp(-dot(q - uPtr, q - uPtr) * 40.0);          // the pointer is a passing low
  p += uVel * 0.03 * q.y;
  float line = band(p, 9.0);
  return vec4(mix(uColA, uColB, smoothstep(-0.6, 0.6, p)), 0.9*line + 0.04);
}

vec4 pulses(vec2 q, float asp){
  float lanes = 9.0; float y = q.y * lanes; float lane = floor(y); float fy = fract(y) - 0.5;
  float fibre = 1.0 - smoothstep(0.0, 0.035, abs(fy));
  float speed = 0.18 + 0.05*hash(vec2(lane, 1.0));
  float x = q.x - uTime*speed - hash(vec2(lane, 2.0));
  float spacing = 0.22; float u = mod(x, spacing) - spacing*0.5;
  float near = exp(-60.0*dot(q - uPtr, q - uPtr));                    // an eavesdropper's disturbance
  float phase = 90.0*q.x + near*uPtrAmp*20.0 + uVel*2.0;
  float pulse = exp(-u*u*420.0) * (0.7 + 0.3*cos(phase)) * (1.0 - smoothstep(0.0, 0.16, abs(fy)));
  return vec4(mix(uColA, uColB, 0.5 + 0.5*cos(phase*0.2 + lane)), 0.55*fibre + pulse);
}

void main(){
  vec2 px = gl_FragCoord.xy; float asp = uRes.x / uRes.y; vec2 q = px / uRes.y;
  vec4 c;
  if (uMode < 0.5) c = interference(q, asp);
  else if (uMode < 1.5) c = flow(q, asp);
  else if (uMode < 2.5) c = spin(q, asp);
  else if (uMode < 3.5) c = lattice(q, asp, px);
  else if (uMode < 4.5) c = isobars(q, asp);
  else c = pulses(q, asp);
  float a = clamp(c.a, 0.0, 1.0) * uAlpha;                            // peak alpha = uAlpha keeps text contrast
  gl_FragColor = vec4(c.rgb, a);                                      // straight alpha; NormalBlending premultiplies once
}`;

const cssRGB = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).split(",").map((v) => +v / 255);

export function mountField({ mode = 0, toggle, getScroll = () => 0, getVelocity = () => 0 }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "low-power" });
  } catch (e) { return null; }
  const canvas = renderer.domElement;
  canvas.className = "lab-field";
  canvas.setAttribute("aria-hidden", "true");
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25) * 0.8);
  renderer.setClearColor(0x000000, 0);
  document.body.prepend(canvas);

  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uMode: { value: mode },
    uPtr: { value: new THREE.Vector2(-1, -1) }, uPtrAmp: { value: 0 }, uScroll: { value: 0 }, uVel: { value: 0 },
    uColA: { value: new THREE.Color() }, uColB: { value: new THREE.Color() }, uAlpha: { value: 0.15 },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthTest: false, depthWrite: false, extensions: { derivatives: true } });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const recolour = () => {
    const a = cssRGB("--field-a"), b = cssRGB("--field-b");
    uniforms.uColA.value.setRGB(a[0], a[1], a[2], THREE.SRGBColorSpace);
    uniforms.uColB.value.setRGB(b[0], b[1], b[2], THREE.SRGBColorSpace);
    uniforms.uAlpha.value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--field-alpha")) || 0.15;
  };
  const size = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, true);
    const v = new THREE.Vector2(); renderer.getDrawingBufferSize(v); uniforms.uRes.value.copy(v);
  };

  let paused = false, last = 0, acc = 0, px = -1, py = -1, pt = 0;
  const loop = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0.016;
    last = now; acc += dt;
    if (acc < 1 / 40) return;                                      // ~40 fps is plenty for a background
    const step = acc; acc = 0;
    uniforms.uTime.value += step;
    uniforms.uPtrAmp.value *= Math.exp(-step / 0.9);
    uniforms.uScroll.value = getScroll();
    const v = getVelocity();
    uniforms.uVel.value += (Math.max(-40, Math.min(40, v)) * 0.02 - uniforms.uVel.value) * Math.min(1, step * 4);
    renderer.render(scene, camera);
  };
  const start = () => { if (!paused && !document.hidden) { last = 0; renderer.setAnimationLoop(loop); } };
  const stop = () => renderer.setAnimationLoop(null);

  window.addEventListener("pointermove", (e) => {
    const now = performance.now();
    const x = (e.clientX / window.innerWidth) * (window.innerWidth / window.innerHeight), y = 1 - e.clientY / window.innerHeight;
    if (px >= 0) {
      const speed = Math.hypot(x - px, y - py) / Math.max((now - pt) / 1000, 0.008);
      uniforms.uPtrAmp.value = Math.min(1.4, uniforms.uPtrAmp.value + speed * 0.05);
    }
    px = x; py = y; pt = now; uniforms.uPtr.value.set(x, y);
  }, { passive: true });
  window.addEventListener("resize", size);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  const retheme = () => { recolour(); renderer.render(scene, camera); };
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", retheme);
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  if (toggle) {
    toggle.hidden = false;
    toggle.setAttribute("aria-pressed", "false");
    toggle.addEventListener("click", () => {
      paused = !paused;
      toggle.setAttribute("aria-pressed", String(paused));
      toggle.textContent = paused ? "Play field" : "Pause field";
      paused ? stop() : start();
    });
  }
  recolour(); size(); renderer.render(scene, camera); start();
  return {
    kick(clientX, clientY) {                                       // a burst at a point, e.g. when a card is entered
      uniforms.uPtr.value.set((clientX / window.innerWidth) * (window.innerWidth / window.innerHeight), 1 - clientY / window.innerHeight);
      uniforms.uPtrAmp.value = Math.min(1.4, uniforms.uPtrAmp.value + 0.8);
    },
  };
}
