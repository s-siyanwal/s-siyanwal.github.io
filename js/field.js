/* Hero background: a two-source wave-interference field, drawn with WebGL.

   Two point sources emit circular waves of the same wavelength; one sits still, the other follows the
   pointer. At rest the panel shows the time-averaged intensity |ψ1 + ψ2|², whose fringes do not move.
   After load and on pointer or scroll input it briefly shows the instantaneous field (Re ψ)², so the
   ripples travel, then it settles back to the fringes within a few seconds (no motion longer than 5 s
   without user input, WCAG 2.2.2).

   Decorative and fail-safe: aria-hidden, nothing at all without WebGL, a single static frame under
   prefers-reduced-motion, hidden in print, and it never sits under text at more than a faint tint. */

const VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
const FS = `precision mediump float;
uniform vec2 s1,s2;uniform float t,k,e,a;uniform vec3 c;
vec2 w(vec2 s,vec2 q){float d=distance(q,s);return vec2(cos(k*d-t),sin(k*d-t))*inversesqrt(1.+d*k*.12);}
void main(){vec2 z=w(s1,gl_FragCoord.xy)+w(s2,gl_FragCoord.xy);
float I=dot(z,z)*.25;float R=z.x*z.x*.5;
gl_FragColor=vec4(c,1.)*a*mix(I,R,e);}`;

const WAVELENGTH = 26;           // CSS px
const SETTLE = 0.9;              // s, decay time of the ripple "energy": motion stops ~3.5 s after the last input

function shader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}

/* The accent colour as 0–1 RGB, read from the live theme so dark mode gets its own tint. */
function accent() {
  const probe = document.createElement("span");
  probe.style.color = "var(--accent)";
  document.body.append(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [31, 92, 84];
  probe.remove();
  return m.slice(0, 3).map((v) => +v / 255);
}

export function mountField(panel) {
  if (!panel || panel.querySelector(".wave-field")) return;
  const cv = document.createElement("canvas");
  cv.className = "wave-field";
  cv.setAttribute("aria-hidden", "true");
  let gl = null;
  try { gl = cv.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true }); } catch (e) { /* none */ }
  if (!gl) return;
  const vs = shader(gl, gl.VERTEX_SHADER, VS), fs = shader(gl, gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = Object.fromEntries(["s1", "s2", "t", "k", "e", "a", "c"].map((n) => [n, gl.getUniformLocation(prog, n)]));

  panel.prepend(cv);
  panel.classList.add("has-field");
  const note = document.createElement("p");
  note.className = "field-note";
  note.innerHTML = 'Background: two interfering waves, <span class="nw">|ψ₁ + ψ₂|²</span>. Move the pointer to move a source.';
  panel.append(note);

  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  const dark = window.matchMedia("(prefers-color-scheme: dark)");
  let W = 1, H = 1, dpr = 1, t = 0, energy = still.matches ? 0 : 1, raf = 0, last = 0, onScreen = true;
  const src = [0.84, 0.3];               // fixed source, as fractions of width and height (from bottom)
  const mov = [0.6, 0.12], aim = [...mov];  // pointer-driven source and its eased target
  let col = accent();

  const draw = () => {
    gl.uniform2f(U.s1, src[0] * W, src[1] * H);
    gl.uniform2f(U.s2, mov[0] * W, mov[1] * H);
    gl.uniform1f(U.t, t);
    gl.uniform1f(U.k, (2 * Math.PI) / (WAVELENGTH * dpr));
    gl.uniform1f(U.e, Math.min(energy, 1));
    gl.uniform1f(U.a, (document.documentElement.dataset.theme || (dark.matches ? "dark" : "light")) === "dark" ? 0.2 : 0.13);
    gl.uniform3f(U.c, col[0], col[1], col[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.max(1, Math.round(cv.clientWidth * dpr));
    H = Math.max(1, Math.round(cv.clientHeight * dpr));
    cv.width = W; cv.height = H;
    gl.viewport(0, 0, W, H);
    draw();
  };
  const frame = (now) => {
    const real = last ? (now - last) / 1000 : 0.016;   // wall-clock step: the settle time holds on slow GPUs
    const dt = Math.min(real, 0.05);                    // capped step for the wave phase and easing
    last = now;
    t += dt * 3.2;
    energy *= Math.exp(-real / SETTLE);
    mov[0] += (aim[0] - mov[0]) * Math.min(1, dt * 6);
    mov[1] += (aim[1] - mov[1]) * Math.min(1, dt * 6);
    draw();
    const moving = Math.abs(aim[0] - mov[0]) + Math.abs(aim[1] - mov[1]) > 0.001;
    if ((energy > 0.02 || moving) && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
    else { raf = 0; last = 0; energy = 0; draw(); }
  };
  const kick = (add) => {
    if (still.matches) return;
    energy = Math.min(1, energy + add);
    if (!raf && onScreen) raf = requestAnimationFrame(frame);
  };

  panel.addEventListener("pointermove", (ev) => {
    const r = panel.getBoundingClientRect();
    aim[0] = (ev.clientX - r.left) / r.width;
    aim[1] = 1 - (ev.clientY - r.top) / r.height;
    kick(0.06);
  });
  window.addEventListener("scroll", () => { if (onScreen) kick(0.04); }, { passive: true });
  new ResizeObserver(size).observe(cv);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; if (onScreen) kick(0); }).observe(panel);
  }
  const recolour = () => { col = accent(); draw(); };
  dark.addEventListener("change", recolour);
  new MutationObserver(recolour).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  still.addEventListener("change", () => { energy = 0; draw(); });
  size();
  kick(0);
}
