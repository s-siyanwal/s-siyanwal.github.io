/* Big Bang intro controller: vacuum → charging (clicks) → bang → reveal → hand-off.
   The intro is an overlay over the real home page, which is already rendered underneath and readable by screen
   readers (the visual layer is aria-hidden). Skippable at any time (button, Esc, scrolling, or moving keyboard focus
   into the page); never a forced wait (idle hint, then an automatic bang). On exit everything is torn down: the
   animation loop, listeners, audio and the WebGL context. Reduced motion: one still frame and an Enter button. */
import { CONFIG } from "./config.js";
import { createGL, background } from "./renderer.js";
import { fields } from "./fields.js";
import { filaments, easeInOut } from "./bang.js";
import { sampleGlyphs, revealer } from "./reveal.js";
import { createAudio } from "./audio.js";
import { fallback2d } from "./fallback2d.js";

const root = document.documentElement;

export function play(opts = {}) {
  return new Promise((resolve) => {
    const C = CONFIG;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(pointer: coarse)").matches || Math.min(innerWidth, innerHeight) < 700;
    try { sessionStorage.setItem(C.sessionKey, "1"); } catch (e) { /* storage blocked */ }
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    root.classList.add("intro-on");
    const lab = () => (window.__lab && window.__lab.lenis) || null;
    const stopScroll = () => { const l = lab(); if (l) { l.scrollTo(0, { immediate: true }); l.stop(); } };
    stopScroll();
    document.addEventListener("lab:ready", stopScroll, { once: true });

    // ---------------------------------------------------------------- DOM
    const el = document.createElement("div");
    el.className = "intro";
    el.innerHTML = `<div class="intro-visual" aria-hidden="true"><canvas></canvas>
        <p class="intro-invite">Start clicking to create.</p><p class="intro-hint">Click anywhere, or press Space.</p></div>
      <div class="intro-ctrls">
        <button type="button" class="intro-sound" aria-pressed="false"><span aria-hidden="true">♪</span><span class="intro-sr">Sound</span></button>
        <button type="button" class="intro-skip">Skip intro</button>
      </div>
      ${reduce ? '<button type="button" class="intro-enter">Enter</button>' : ""}`;
    document.body.prepend(el);
    const canvas = el.querySelector("canvas"), invite = el.querySelector(".intro-invite"), hint = el.querySelector(".intro-hint");
    const skipBtn = el.querySelector(".intro-skip"), soundBtn = el.querySelector(".intro-sound");
    skipBtn.setAttribute("aria-label", "Skip intro");

    const audio = createAudio(C.soundDefault);
    const paintSound = () => {
      soundBtn.setAttribute("aria-pressed", String(audio.on));
      soundBtn.setAttribute("aria-label", audio.on ? "Sound on. Turn intro sound off" : "Sound off. Turn intro sound on");
      soundBtn.classList.toggle("is-on", audio.on);
    };
    soundBtn.addEventListener("click", (e) => { e.stopPropagation(); audio.toggle(); paintSound(); });
    paintSound();

    // ---------------------------------------------------------------- renderer
    let dpr = Math.min(window.devicePixelRatio || 1, C.dprCap);
    const size = () => { canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr); };
    size();
    const count = mobile ? C.particles.mobile : C.particles.desktop;
    let gl = createGL(canvas), passes = null, draw2d = null;
    if (gl) {
      try {
        passes = { bg: background(gl, C.colors), fields: fields(gl, C.colors, count), strings: filaments(gl, C.colors, C.particles.filaments) };
      } catch (e) { console.warn("intro: WebGL setup failed, using 2D", e); gl = null; }
    }
    if (!gl) draw2d = fallback2d(canvas, C.colors, mobile ? 600 : 1400);

    // ---------------------------------------------------------------- state
    const st = { time: 0, energy: 0, kick: 0, bang: -1, bangLen: C.eruptionMs, fade: 1, dpr, ptr: [9, 9], ptrOn: 0 };
    let phase = "charging", clicks = 0, raf = 0, last = performance.now(), t0 = last, bangAt = 0, revealAt = 0, reveal = null, revealDraw = null;
    let probeFrames = 0, probed = false, withReveal = true, outAt = 0, done = false;
    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      st.time += dt;
      st.energy += (Math.min(1, clicks / C.clicks) - st.energy) * Math.min(1, dt * 4);
      st.kick *= Math.exp(-dt * 3.2);
      st.ptrOn += ((st.ptr[0] < 8 ? 1 : 0) - st.ptrOn) * Math.min(1, dt * 3);
      if (!probed) {                                                  // FPS probe: downgrade once if slow
        probeFrames += 1;
        if (now - t0 > C.fpsProbeMs) {
          probed = true;
          if ((probeFrames * 1000) / (now - t0) < C.minFps && passes) { passes.fields.reduce(0.5); dpr = 1; st.dpr = 1; size(); if (gl) gl.viewport(0, 0, canvas.width, canvas.height); }
        }
      }
      if (phase === "bang" || phase === "reveal" || phase === "out") st.bang = now - bangAt;
      let rp = 0;
      if (phase === "reveal") {
        rp = Math.min(1, (now - revealAt) / C.revealMs);
        st.fade = 1 - easeInOut(Math.min(1, Math.max(0, (rp - 0.3) / 0.6)));
        if (rp >= 1) return finish();
      }
      if (phase === "out") {
        st.fade = Math.max(0, 1 - (now - outAt) / 280);
        if (st.fade <= 0) return finish();
      }
      const shake = st.kick * (phase === "charging" ? 2.2 : 0);
      canvas.style.transform = shake > 0.05 ? `translate(${((Math.random() - 0.5) * shake).toFixed(2)}px, ${((Math.random() - 0.5) * shake).toFixed(2)}px)` : "";
      if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        passes.bg(st); passes.fields(st); passes.strings(st);
        if (revealDraw && phase === "reveal") revealDraw(st, rp);
      } else if (draw2d) draw2d(st);
    };

    const renderStill = () => {                                       // reduced motion: one still frame, no loop
      st.time = 7.3; st.energy = 0.15;
      if (gl && passes) { gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); passes.bg(st); passes.fields(st); }
      else if (draw2d) draw2d(st);
    };

    // ---------------------------------------------------------------- phases
    const click = () => {
      if (phase !== "charging") return;
      clicks += 1; st.kick = 1;
      audio.resumeIfOn(); audio.setEnergy(Math.min(1, clicks / C.clicks));
      hint.classList.remove("is-on");
      idle();
      if (clicks >= C.clicks) bang(C.eruptionMs, true);
    };
    function bang(len, reveal_) {
      if (phase !== "charging") return;
      phase = "bang"; bangAt = performance.now(); st.bangLen = len; withReveal = reveal_;
      timers.forEach(clearTimeout);
      invite.classList.add("is-gone"); hint.classList.remove("is-on");
      audio.setEnergy(1); audio.bloom();
      const revealStart = len * (1 - (withReveal ? C.revealOverlap : 0));
      later(revealStart, () => (withReveal && gl ? startReveal() : fadeOut()));
    }
    async function startReveal() {
      try { if (document.fonts) await document.fonts.ready; } catch (e) { /* ignore */ }
      if (done || phase !== "bang") return;
      try { reveal = sampleGlyphs(mobile ? C.particles.reveal.mobile : C.particles.reveal.desktop); revealDraw = reveal.pts.length ? revealer(gl, C.colors, reveal) : null; } catch (e) { revealDraw = null; }
      phase = "reveal"; revealAt = performance.now();
    }
    function fadeOut() { if (phase === "out" || done) return; phase = "out"; outAt = performance.now(); if (!raf) finish(); }
    const skip = () => {
      if (done) return;
      if (reduce || C.skipMode === "instant" || !(gl || draw2d)) return finish();
      if (phase === "charging") bang(C.skipBangMs, false);
      else fadeOut();
    };
    const idle = () => {
      timers.forEach(clearTimeout); timers.length = 0;
      if (reduce) return;
      later(C.idleHintMs, () => { if (phase === "charging") hint.classList.add("is-on"); });
      later(C.idleAutoMs, () => bang(C.eruptionMs, true));
    };

    // ---------------------------------------------------------------- input
    const onDown = (e) => { if (e.target.closest(".intro-ctrls, .intro-enter")) return; click(); };
    const onMove = (e) => { st.ptr = [(e.clientX - innerWidth / 2) / (innerHeight / 2), -(e.clientY - innerHeight / 2) / (innerHeight / 2)]; };
    const onLeave = () => { st.ptr = [9, 9]; };
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); skip(); return; }
      const onCtrl = e.target.closest && e.target.closest(".intro-ctrls, .intro-enter");
      if ((e.key === " " || e.key === "Enter") && !onCtrl) { e.preventDefault(); reduce ? finish() : click(); return; }
      if (["PageDown", "PageUp", "ArrowDown", "ArrowUp", "End", "Home"].includes(e.key) && !onCtrl) { e.preventDefault(); skip(); }
    };
    const onWheel = (e) => { e.preventDefault(); skip(); };
    const onTouchMove = (e) => { e.preventDefault(); skip(); };
    const onFocus = (e) => { if (!el.contains(e.target)) skip(); };
    const onVis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf && !reduce && !done) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const onLost = (e) => { e.preventDefault(); finish(); };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    document.addEventListener("keydown", onKey);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("focusin", onFocus);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", size);
    canvas.addEventListener("webglcontextlost", onLost);
    skipBtn.addEventListener("click", (e) => { e.stopPropagation(); skip(); });
    const enter = el.querySelector(".intro-enter");
    if (enter) enter.addEventListener("click", (e) => { e.stopPropagation(); finish(); });

    // ---------------------------------------------------------------- teardown
    function finish() {
      if (done) return;
      done = true;
      const focusInside = el.contains(document.activeElement);
      const removeAll = () => {
        cancelAnimationFrame(raf); raf = 0;
        timers.forEach(clearTimeout);
        el.removeEventListener("pointerdown", onDown); el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave);
        document.removeEventListener("keydown", onKey); el.removeEventListener("wheel", onWheel); el.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("focusin", onFocus); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("resize", size);
        canvas.removeEventListener("webglcontextlost", onLost);
        if (gl) { const ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); }
        gl = null; passes = null; revealDraw = null;
        audio.stop();
        el.remove();
        root.classList.remove("intro-on");
        const l = lab(); if (l) l.start();
        if (focusInside) { const m = document.getElementById("main"); if (m) { m.setAttribute("tabindex", "-1"); m.focus({ preventScroll: true }); } }
        resolve();
      };
      if (reduce) { el.classList.add("is-leaving"); setTimeout(removeAll, 450); } else removeAll();
    }

    // ---------------------------------------------------------------- go
    if (reduce) { renderStill(); invite.textContent = "A still of the quantum vacuum."; return; }
    el.classList.add("is-live");
    idle();
    raf = requestAnimationFrame(frame);
    if (opts.replay) invite.classList.remove("is-gone");
  });
}
