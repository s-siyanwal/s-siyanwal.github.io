/* Lab edition background: a superposition of circular waves, ψ = Σ ψ_i, drawn with WebGL as contour lines of
   |ψ|² coloured by the phase arg ψ (two theme colours). The story grows with scroll: one source at the top of
   the page, then two-source interference, then a richer multi-source field. The pointer is a moving source
   whose strength follows pointer speed; pulse(x, y) sends a Gaussian wave packet out from a point.

   Fail-safe: decorative and aria-hidden; nothing without WebGL; a visible Pause control (WCAG 2.2.2); one static
   frame under prefers-reduced-motion or on coarse-pointer / small screens; paused when the tab is hidden;
   hidden in print. Rendered at reduced resolution and capped at ~30 fps to stay light. */

const VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
const FS = `#extension GL_OES_standard_derivatives : enable
precision mediump float;
uniform vec2 R;uniform float T,K,A;uniform vec3 S[4];uniform vec3 P;uniform vec4 Q[4];uniform vec3 CA,CB;
vec2 src(vec2 q,vec2 s,float w,float om){float d=distance(q,s);float ph=K*d-om*T;return w*vec2(cos(ph),sin(ph))*inversesqrt(1.+d*K*.08);}
void main(){
  vec2 q=gl_FragCoord.xy;vec2 z=vec2(0.);float n=.0001;
  for(int i=0;i<4;i++){z+=src(q,S[i].xy*R,S[i].z,1.);n+=S[i].z;}
  z+=src(q,P.xy*R,P.z,1.7);n+=P.z;
  for(int i=0;i<4;i++){float d=distance(q,Q[i].xy*R);float r=d-Q[i].z*260.;float g=exp(-r*r/1800.)*Q[i].w;
    z+=g*vec2(cos(K*d),sin(K*d));n+=Q[i].w*.5;}
  float I=dot(z,z)/(n*n);
  float c=sqrt(I)*7.;float f=fract(c);float d=min(f,1.-f);
  float line=1.-smoothstep(0.,fwidth(c)*1.3,d);
  vec3 col=mix(CA,CB,.5+.5*cos(atan(z.y,z.x)));
  float a=A*(.25*min(I*2.,1.)+.75*line*min(I*4.,1.));
  gl_FragColor=vec4(col*a,a);
}`;

const LAMBDA = 34;                         // CSS px
const SOURCES = [                          // [x, y from bottom, scroll window where it fades in]
  [0.82, 0.74, -1, 0], [0.12, 0.22, 0.06, 0.2], [0.52, 0.04, 0.34, 0.5], [0.96, 0.3, 0.6, 0.76],
];
const smooth = (a, b, x) => (b <= a ? 1 : Math.min(1, Math.max(0, (x - a) / (b - a))) ** 2 * (3 - 2 * Math.min(1, Math.max(0, (x - a) / (b - a)))));

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}
const cssRGB = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).split(",").map((v) => +v / 255);

export function mountLabField({ toggle, hint } = {}) {
  const none = { pulse() {} };
  const cv = document.createElement("canvas");
  cv.className = "lab-field";
  cv.setAttribute("aria-hidden", "true");
  let gl = null;
  try { gl = cv.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true }); } catch (e) { /* none */ }
  if (!gl || !gl.getExtension("OES_standard_derivatives")) return none;
  const vs = compile(gl, gl.VERTEX_SHADER, VS), fs = compile(gl, gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return none;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return none;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ["R", "T", "K", "A", "S", "P", "Q", "CA", "CB"].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
  document.body.prepend(cv);

  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  const lite = window.matchMedia("(pointer: coarse), (max-width: 719px)");
  const animated = () => !still.matches && !lite.matches;
  let W = 1, H = 1, scale = 1, t = 0, raf = 0, last = 0, paused = false, prog01 = 0;
  const ptr = { x: 0.5, y: 0.5, amp: 0 };
  const pulses = [];                      // {x, y, age}
  let colA = [0, 0, 0], colB = [0, 0, 0], alpha = 0.2;
  const recolour = () => {
    colA = cssRGB("--field-a"); colB = cssRGB("--field-b");
    alpha = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--field-alpha")) || 0.2;
  };

  const draw = () => {
    gl.uniform2f(U.R, W, H);
    gl.uniform1f(U.T, t);
    gl.uniform1f(U.K, (2 * Math.PI) / (LAMBDA * scale));
    gl.uniform1f(U.A, alpha);
    const s = [];
    SOURCES.forEach(([x, y, a, b]) => s.push(x, y, smooth(a, b, prog01)));
    gl.uniform3fv(U.S, s);
    gl.uniform3f(U.P, ptr.x, ptr.y, ptr.amp);
    const q = [];
    for (let i = 0; i < 4; i++) {
      const p = pulses[i];
      q.push(p ? p.x : 0, p ? p.y : 0, p ? p.age : 0, p ? Math.max(0, 1 - p.age / 2.4) * 1.4 : 0);
    }
    gl.uniform4fv(U.Q, q);
    gl.uniform3f(U.CA, colA[0], colA[1], colA[2]);
    gl.uniform3f(U.CB, colB[0], colB[1], colB[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const size = () => {
    scale = Math.min(window.devicePixelRatio || 1, 1.25) * 0.75;
    W = Math.max(1, Math.round(window.innerWidth * scale));
    H = Math.max(1, Math.round(window.innerHeight * scale));
    cv.width = W; cv.height = H;
    gl.viewport(0, 0, W, H);
    draw();
  };
  const frame = (now) => {
    raf = 0;
    if (paused || document.hidden || !animated()) return;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0.033;
    if (dt < 0.03) { raf = requestAnimationFrame(frame); return; }   // ~30 fps cap
    last = now;
    t += dt * 1.6;
    ptr.amp *= Math.exp(-dt / 0.9);
    for (let i = pulses.length - 1; i >= 0; i--) { pulses[i].age += dt; if (pulses[i].age > 2.4) pulses.splice(i, 1); }
    draw();
    raf = requestAnimationFrame(frame);
  };
  const run = () => { if (!raf && !paused && animated() && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };

  // Scroll progress drives how many sources are on; in static mode each change redraws once.
  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      prog01 = max > 0 ? window.scrollY / max : 0;
      if (!raf) draw();
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => { size(); onScroll(); });
  let px = -1, py = -1, pt = 0;
  window.addEventListener("pointermove", (e) => {
    if (!animated() || paused) return;
    const now = performance.now(), x = e.clientX / window.innerWidth, y = 1 - e.clientY / window.innerHeight;
    if (px >= 0) {
      const v = Math.hypot(x - px, y - py) / Math.max((now - pt) / 1000, 0.008);
      ptr.amp = Math.min(1.4, ptr.amp + v * 0.05);
    }
    px = x; py = y; pt = now; ptr.x = x; ptr.y = y;
  }, { passive: true });
  document.addEventListener("visibilitychange", run);
  const theme = window.matchMedia("(prefers-color-scheme: dark)");
  const retheme = () => { recolour(); if (!raf) draw(); };
  theme.addEventListener("change", retheme);
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const remode = () => { if (toggle) toggle.hidden = !animated(); if (hint) hint.hidden = !animated(); if (animated()) run(); else draw(); };
  still.addEventListener("change", remode);
  lite.addEventListener("change", remode);

  if (toggle) {
    toggle.setAttribute("aria-pressed", "false");
    toggle.addEventListener("click", () => {
      paused = !paused;
      toggle.setAttribute("aria-pressed", String(paused));
      toggle.textContent = paused ? "Play field" : "Pause field";
      if (paused) draw(); else run();
    });
  }
  recolour();
  size();
  onScroll();
  remode();

  return {
    pulse(clientX, clientY) {
      if (!animated() || paused) return;
      pulses.push({ x: clientX / window.innerWidth, y: 1 - clientY / window.innerHeight, age: 0 });
      if (pulses.length > 4) pulses.shift();
      run();
    },
  };
}
