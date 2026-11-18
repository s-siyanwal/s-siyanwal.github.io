/* Intro controller (lab home): point → wave → measurement → name, about 4.5 s, no input needed.
   The intro is an overlay over the real home page, which is already rendered underneath and readable by screen
   readers (the visual layer is aria-hidden). Any click, key, scroll, "Skip" or moving keyboard focus into the page
   fast-forwards smoothly to the end state (never a hard cut). The points land on the real hero name, the black
   dissolves into the page and the DOM text sharpens in at the same place, so there is no layout shift; the tagline
   fades in last. On exit everything is torn down: the animation loop, listeners and the WebGL context.
   Reduced motion: no animation, the page with its final name simply fades in. */
import { CONFIG as C } from "./config.js";
import { E, seg, geometry, crossings, assign, along } from "./timeline.js";
import { glyphTargets } from "./glyphs.js";
import { tone } from "./audio.js";
import { webgl } from "./webgl.js";
import { canvas2d } from "./fallback2d.js";

const root = document.documentElement;
const isDark = () => {
  const t = root.getAttribute("data-theme");
  return t === "dark" || (t !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
};
const hex2rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}, ${a})`; };

export function play(opts = {}) {
  return new Promise((resolve) => {
    const replay = !!opts.replay, dark = isDark();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try { sessionStorage.setItem(C.sessionKey, "1"); } catch (e) { /* storage blocked */ }
    if (!dark && C.lightMode === "skip") { root.classList.remove("intro-on"); resolve(); return; }
    const pal = dark ? C.colors.dark : C.colors.light;
    const mobile = window.matchMedia("(pointer: coarse)").matches || Math.min(innerWidth, innerHeight) < 700;
    const name = document.getElementById("h-name"), tagline = document.getElementById("h-tagline");
    const lab = () => (window.__lab && window.__lab.lenis) || null;
    const toTop = () => { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; window.scrollTo(0, 0); const l = lab(); if (l) { l.scrollTo(0, { immediate: true }); l.stop(); } };

    // ---------------------------------------------------------------- DOM
    if (replay) { if (name) name.style.opacity = "1"; if (tagline) tagline.style.opacity = "1"; }
    if (tagline) tagline.style.transition = `opacity ${C.taglineMs}ms cubic-bezier(.22,.61,.36,1)`;
    const el = document.createElement("div");
    el.className = "intro";
    el.innerHTML = '<div class="intro-bg" aria-hidden="true"></div><canvas aria-hidden="true"></canvas><button type="button" class="intro-skip">Skip</button>';
    const bg = el.firstElementChild, canvas = el.querySelector("canvas"), skipBtn = el.querySelector(".intro-skip");
    bg.style.background = pal.tint > 0 ? `radial-gradient(circle at 50% 50%, ${hex2rgba(pal.accent, pal.tint)}, rgba(0,0,0,0) 55%), ${pal.bg}` : pal.bg;
    skipBtn.setAttribute("aria-label", "Skip intro");
    if (replay) bg.style.opacity = "0";
    document.body.prepend(el);
    root.classList.add("intro-on", "intro-live");                    // the overlay's own black replaces the cover
    if (!replay) toTop();
    document.addEventListener("lab:ready", () => { if (!done) toTop(); }, { once: true });

    // ---------------------------------------------------------------- renderer and scene
    let dpr = Math.min(window.devicePixelRatio || 1, C.dprCap);
    const size = () => { canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr); };
    size();
    const maxHits = mobile ? C.hits.mobile : C.hits.desktop;
    let R = reduce ? null : (webgl(canvas, pal, maxHits) || canvas2d(canvas, pal));
    const g = geometry(innerWidth, innerHeight, mobile);
    const hits = R ? crossings(g, innerWidth, innerHeight, maxHits) : [];
    let landed = false, sampled = false;
    const sample = () => {                                            // the name's letters, once fonts are ready
      if (sampled) return;
      sampled = true;
      try { landed = assign(hits, glyphTargets(hits.length)); } catch (e) { landed = false; }
    };
    const s = {
      g, dpr, hair: C.wave.hairline, decay: C.wave.decay, bendR: C.wave.bendRadius,
      front: 0, half: 0, waveA: 0, c: 0, bend: 0, acc: 0, ptrX: -1e4, ptrY: -1e4,
      pt: new Float32Array((hits.length + 2) * 5), nPt: 0, ln: new Float32Array(hits.length * 2 * 3), nLn: 0,
    };
    let ptr = null, ptrOn = 0, T = replay ? -C.replayInMs : 0, last = performance.now(), raf = 0, ff = null, done = false;
    let probe = null, toned = false, atZero = !replay, hiddenAt = 0;

    const update = (dt) => {
      const t = C.t;
      const bgA = T < 0 ? E.inOut(1 + T / C.replayInMs) : 1 - E.inOut(seg(T, t.bgOut[0], t.bgOut[1]));
      bg.style.opacity = String(bgA);
      skipBtn.style.setProperty("--k", bgA.toFixed(3));              // "Skip" leaves with the black
      if (T < 0) return;
      if (!atZero) {                                                  // replay: the page is covered now
        atZero = true; toTop();
        if (tagline) tagline.style.opacity = "";
      }
      if (!sampled && (T > 2600 || !document.fonts || document.fonts.status === "loaded")) sample();
      const nameA = E.inOut(seg(T, t.nameIn[0], t.nameIn[1]));
      if (name) { name.style.opacity = String(nameA); name.style.filter = nameA < 1 ? `blur(${(C.nameBlur * (1 - nameA)).toFixed(2)}px)` : ""; }
      if (!R) return;

      const uW = seg(T, t.wave[0], t.wave[1]);
      const cRaw = seg(T, t.collapse[0], t.collapse[1]), c = E.inOut(cRaw);
      const gain = 1 + C.swell * Math.sin(Math.PI * cRaw) ** 2;      // one soft luminance swell, no flash
      const sepK = E.inOut(seg(T, t.split[0], t.split[1]));
      const waveIn = E.inOut(seg(T, t.wave[0], t.wave[0] + 350));
      ptrOn += ((ptr ? 1 : 0) - ptrOn) * Math.min(1, dt / 400);
      if (ptr) { s.ptrX = ptr[0]; s.ptrY = ptr[1]; }
      s.front = g.R * E.out(uW); s.half = (g.sep * sepK) / 2; s.c = c;
      s.waveA = C.wave.alpha * waveIn * gain;
      s.acc = C.wave.accentAlpha * sepK * waveIn * (1 - c);
      s.bend = C.wave.bend * ptrOn * (1 - E.inOut(seg(T, t.bendOff[0], t.bendOff[1])));
      if (!toned && T >= t.collapse[0] + 250) { toned = true; tone(); }

      let n = 0, m = 0;
      const pa = E.inOut(seg(T, t.point[0], t.point[1])) * (1 - E.inOut(seg(T, t.pointOut[0], t.pointOut[1])));
      if (pa > 0.002) {                                               // the first point of light and its faint halo
        s.pt.set([g.cx, g.cy, pa * C.point.haloAlpha, C.point.halo, 1], n * 5); n++;
        s.pt.set([g.cx, g.cy, pa, C.point.size, 0], n * 5); n++;
      }
      if (cRaw > 0) {
        const out = 1 - E.inOut(landed ? seg(T, t.dotsOut[0], t.dotsOut[1]) : seg(T, t.glide, t.glide + 600));
        for (const h of hits) {
          const aIn = E.inOut(seg(cRaw, 0.3 + 0.35 * h.r, 0.65 + 0.35 * h.r));
          let a = aIn * (0.5 + 0.5 * h.vis) * gain * out, x = h.x0, y = h.y0, size = C.hits.size;
          if (landed) {
            const u = seg(T, t.glide + h.delay, t.glide + h.delay + C.glide.dur), e = E.glide(u);
            [x, y] = along(h, e);
            a = aIn * (0.5 + 0.5 * h.vis + (0.5 - 0.5 * h.vis) * e) * gain * out;
            size = C.hits.size + (C.hits.landSize - C.hits.size) * e;
            if (u > 0 && u < 1 && m < s.ln.length / 3 - 1) {         // motion blur: a short trail behind the point
              const [tx, ty] = along(h, E.glide(Math.max(0, u - C.glide.trail)));
              if ((tx - x) ** 2 + (ty - y) ** 2 > 0.5) { s.ln.set([tx, ty, 0, x, y, a * 0.4], m * 3); m += 2; }
            }
          }
          if (a > 0.002 && n < s.pt.length / 5) { s.pt.set([x, y, a, size, 0], n * 5); n++; }
        }
      }
      s.nPt = n; s.nLn = m;
      R.draw(s);
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      const dt = Math.min(50, now - last); last = now;
      if (ff) {                                                       // smooth fast-forward: a Hermite curve that starts at
        const u = Math.min(1, (now - ff.at) / C.fastForwardMs);       // the current speed and eases into the end state
        const h = (u * u * u - 2 * u * u + u) * ff.v0 + (3 * u * u - 2 * u * u * u);
        T = ff.from + (C.t.end - ff.from) * h;
      } else T += dt;
      if (R && !probe && T >= C.t.wave[0]) probe = { at: now, n: 0 };
      if (probe && !probe.done) {                                     // one FPS check: lower the resolution if slow
        probe.n++;
        if (now - probe.at > C.fpsProbeMs) {
          probe.done = true;
          if ((probe.n * 1000) / (now - probe.at) < C.minFps && dpr > 0.75) { dpr = dpr > 1 ? 1 : 0.75; s.dpr = dpr; size(); }
        }
      }
      update(dt);
      if (T >= C.t.end) finish();
    };

    // ---------------------------------------------------------------- input
    const fastForward = () => {
      if (done || ff || reduce) return;
      const left = C.t.end - T;
      if (left <= C.fastForwardMs) return;                            // already about to end
      ff = { at: performance.now(), from: T, v0: C.fastForwardMs / left };
    };
    const onDown = (e) => { if (!e.target.closest(".intro-skip")) fastForward(); };
    const onMove = (e) => { if (e.pointerType === "mouse" || e.pointerType === "pen") ptr = [e.clientX, e.clientY]; };
    const onLeave = () => { ptr = null; };
    const onKey = (e) => {
      if (["Tab", "Shift", "Alt", "Control", "Meta", "CapsLock"].includes(e.key)) return;
      if (e.target === skipBtn && (e.key === "Enter" || e.key === " ")) return;  // the button's own click handles it
      if ([" ", "Enter", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "End", "Home", "Escape"].includes(e.key)) e.preventDefault();
      fastForward();
    };
    const onWheel = (e) => { e.preventDefault(); fastForward(); };
    const onTouchMove = (e) => { e.preventDefault(); fastForward(); };
    const onFocus = (e) => { if (!el.contains(e.target)) fastForward(); };
    const onVis = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; hiddenAt = performance.now(); }
      else if (!raf && !done && !reduce) { last = performance.now(); if (ff) ff.at += last - hiddenAt; raf = requestAnimationFrame(frame); }
    };
    const onResize = () => { size(); fastForward(); };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    document.addEventListener("keydown", onKey);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("focusin", onFocus);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", onResize);
    skipBtn.addEventListener("click", (e) => { e.stopPropagation(); reduce ? leave() : fastForward(); });
    if (R) R.lost((e) => { if (done) return; e.preventDefault(); R = null; leave(); });

    // ---------------------------------------------------------------- exit
    function leave() {                                                // a gentle fade when there is nothing to animate
      if (done || el.classList.contains("is-leaving")) return;
      cancelAnimationFrame(raf); raf = 0;
      if (name) { name.style.opacity = "1"; name.style.filter = ""; }
      el.style.opacity = "";
      el.classList.add("is-leaving");
      setTimeout(finish, 650);
    }
    function finish() {
      if (done) return;
      done = true;
      const focusInside = el.contains(document.activeElement);
      cancelAnimationFrame(raf); raf = 0;
      el.removeEventListener("pointerdown", onDown); el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("keydown", onKey); el.removeEventListener("wheel", onWheel); el.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("focusin", onFocus); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("resize", onResize);
      if (R) R.destroy();
      R = null;
      el.remove();
      if (name) { name.style.opacity = ""; name.style.filter = ""; }
      if (tagline) tagline.style.opacity = "";
      root.classList.remove("intro-on", "intro-live");                // the tagline fades in last (its transition)
      setTimeout(() => { if (tagline) tagline.style.transition = ""; }, C.taglineMs + 100);
      const l = lab(); if (l) l.start();
      if (focusInside) { const main = document.getElementById("main"); if (main) { main.setAttribute("tabindex", "-1"); main.focus({ preventScroll: true }); } }
      resolve();
    }

    // ---------------------------------------------------------------- go
    if (reduce) {                                                     // a still: the final page, faded in gently
      if (name) name.style.opacity = "1";
      if (tagline) tagline.style.opacity = "1";
      bg.style.opacity = "1";
      if (replay) {                                                   // fade the still in over the page, then out
        el.style.opacity = "0";
        requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = `opacity ${C.replayInMs}ms ease`; el.style.opacity = "1"; }));
        setTimeout(() => { el.style.transition = ""; toTop(); leave(); }, C.replayInMs + 250);
      } else setTimeout(leave, 250);
      return;
    }
    raf = requestAnimationFrame(frame);
  });
}
