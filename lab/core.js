/* Site core: shared by every lab page.
   - data from data/content.json (the single source of truth)
   - chrome: top bar, footer, "On this page" navigator with a three.js Bloch sphere
   - motion: Lenis smooth scroll driving GSAP ScrollTrigger; word-split heading reveals, scrubbed text,
     count-ups, a magnetic kinetic name, page-to-page curtain transitions, the three.js field
   Fail-safe: every page is prerendered and complete without JS; nothing is hidden by CSS alone; under
   prefers-reduced-motion there is no Lenis, no scrubbing, no curtain and no field (native scroll, still
   content); a 2.5 s timeout and a beforeprint handler force everything visible. */
import { esc } from "../js/site.js";

export const root = document.documentElement;
export const $ = (id) => document.getElementById(id);
export const PRERENDER = Boolean(window.__PRERENDER__);
export const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
export const MOTION = !PRERENDER && !REDUCE && Boolean(gsap && ScrollTrigger);
export const DESKTOP = window.matchMedia("(min-width: 900px) and (pointer: fine)").matches;
export { esc };

root.classList.add("js");

/* ---------------------------------------------------------------- data */
export async function loadData() {
  const res = await fetch("data/content.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`content.json: ${res.status}`);
  return res.json();
}

/* Optional data files (links.json: artifacts and proofs; journey.json: photos and videos). A missing or broken file
   only hides the features that use it. */
async function loadOptional(name) {
  try { const r = await fetch(`data/${name}`, { cache: "no-cache" }); return r.ok ? await r.json() : {}; } catch (e) { return {}; }
}
export const extras = { links: {}, journey: {} };

/* A link stored in links.json: an https URL, or a repo path such as assets/docs/x.pdf (relative to the site root). */
export const hrefOf = (v) => (!v ? "" : /^(https?:|mailto:)/.test(v) ? v : String(v).replace(/^\/+/, ""));

/* A proof in links.json: proofs (awards), certificate_proofs, or role_proofs ("role @ org"). Empty values stay hidden. */
export const proofOf = (bucket, key) => hrefOf(((extras.links || {})[bucket] || {})[key]);
export const viewProof = (href, label) =>
  href ? ` <a class="view-proof" href="${esc(href)}" target="_blank" rel="noopener">View proof<span class="sr">: ${esc(label)}</span></a>` : "";


/* ---------------------------------------------------------------- chrome */
const NAV = [["index.html#work", "Work", "work"], ["about.html", "About", "about"], ["path.html", "Path", "path"], ["papers.html", "Papers", "papers"],
  ["cv.html", "CV", "cv"], ["personal.html", "Personal", "personal"], ["references.html", "References", "references"]];

/* Footer sign-offs: one per page, chosen from the page name so it is stable between visits and in the prerendered HTML. */
export const SIGNOFFS = [["Still", "measuring."], ["Still", "initializing."], ["Still", "optimizing."], ["Still", "entangled."],
  ["Awaiting", "collapse."], ["Still", "in superposition."], ["Still", "converging."]];
const PAGE_SIGNOFF = { work: 0, about: 1, path: 2, papers: 3, cv: 4, personal: 5, references: 6 };
function signoff(page) {
  if (page in PAGE_SIGNOFF) return SIGNOFFS[PAGE_SIGNOFF[page]];
  let h = 0; for (const c of location.pathname) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return SIGNOFFS[h % SIGNOFFS.length];
}

export function chrome(data, active) {
  const p = data.profile || {};
  $("bar").innerHTML = `
    <a class="mark" href="index.html">${esc(p.name || "")}</a>
    <nav class="bar-nav" aria-label="Sections">${NAV.map(([href, label, key], i) =>
      `<a href="${href}"${key === active ? ' aria-current="page"' : ""}>${label}<span class="num">${String(i + 1).padStart(2, "0")}</span></a>`).join("")}</nav>
    <div class="bar-tools">
      <button type="button" class="field-toggle" hidden>Pause field</button>
      <button type="button" class="theme-toggle">Theme: Auto</button>
    </div>`;
  const links = [];
  if (p.email) links.push([`mailto:${p.email}`, "Email"]);
  (p.profiles || []).filter((x) => x.url && !x.url.startsWith("mailto:")).forEach((x) => links.push([x.url, x.label]));
  links.push(["references.html", "References"]);
  const [lead, word] = signoff(active);
  $("foot").innerHTML = `
    <p class="foot-big" data-split>${lead} <em>${word}</em></p>
    <div class="foot-row">
      <p>${esc([p.name, p.location].filter(Boolean).join(" · "))}</p>
      <ul class="foot-links">${links.map(([h, l]) => `<li><a href="${esc(h)}"${h.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(l)}</a></li>`).join("")}</ul>
      <p><a href="#top" data-top>Return to |0⟩ ↑</a></p>
    </div>`;
  themeToggle(document.querySelector(".theme-toggle"));
  replayControl(active);
}

/* "Replay intro" sits in a corner of every lab page. On the home page it replays in place (intro/ handles it) and
   has a companion "Intro sound" switch (off by default; the intro itself shows nothing but "Skip"). Elsewhere it
   opens the home page with ?intro=1. */
function replayControl(active) {
  document.querySelectorAll(".replay-tools").forEach((n) => n.remove());
  const box = document.createElement("div");
  box.className = "replay-tools";
  const a = document.createElement("a");
  a.className = "replay-intro";
  a.href = "index.html?intro=1";
  a.textContent = "Replay intro";
  a.addEventListener("click", (e) => {
    if (active === "work" && window.__intro && typeof window.__intro.replay === "function") { e.preventDefault(); window.__intro.replay(); }
  });
  box.append(a);
  if (active === "work" && document.getElementById("h-name")) {   // the home page only (project pages share "work")
    const b = document.createElement("button");
    b.type = "button"; b.className = "replay-intro intro-sound";
    const get = () => { try { return localStorage.getItem("intro-sound") === "on"; } catch (e) { return false; } };
    const paint = () => { b.textContent = get() ? "Intro sound: on" : "Intro sound: off"; };
    b.addEventListener("click", () => { try { localStorage.setItem("intro-sound", get() ? "off" : "on"); } catch (e) { /* blocked */ } paint(); });
    paint();
    box.append(b);
  }
  tools().append(box);
}

/* Fixed page controls (Replay intro, Contents) live in one complementary landmark. */
function tools() {
  let t = document.querySelector(".page-tools");
  if (!t) { t = document.createElement("aside"); t.className = "page-tools"; t.setAttribute("aria-label", "Page tools"); document.body.append(t); }
  return t;
}

function themeToggle(btn) {
  const order = ["auto", "light", "dark"];
  let cur = "auto";
  try { cur = localStorage.getItem("theme") || "auto"; } catch (e) { /* storage blocked */ }
  if (!order.includes(cur)) cur = "auto";
  const paint = () => { btn.textContent = `Theme: ${cur[0].toUpperCase()}${cur.slice(1)}`; btn.setAttribute("aria-label", `Theme: ${cur}. Switch colour theme`); };
  btn.addEventListener("click", () => {
    cur = order[(order.indexOf(cur) + 1) % 3];
    if (cur === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", cur);
    try { cur === "auto" ? localStorage.removeItem("theme") : localStorage.setItem("theme", cur); } catch (e) { /* blocked */ }
    paint();
  });
  paint();
}

/* "On this page": a table of contents built from the live page. Top level: every visible <section id> with an <h2>;
   second level: the <h3>s inside it (given ids here). Scroll-spy marks the current section and sub-section, groups
   open as you reach them and can be opened by hand. Wide screens: fixed panel with the three.js Bloch sphere.
   Narrower: a "Contents" button opens the same list as a drawer. */
const slugify = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
function pageNav() {
  document.querySelectorAll(".page-nav, .toc-toggle").forEach((n) => n.remove());
  document.body.classList.remove("has-toc");
  const secs = [...document.querySelectorAll("main section[id]:not([hidden])")].map((s) => [s, s.querySelector("h2")]).filter(([, h]) => h);
  if (secs.length < 2) return null;
  const groups = secs.map(([s, h]) => {
    const subs = [...s.querySelectorAll("h3")].filter((h3) => h3.offsetParent !== null || PRERENDER).slice(0, 12).map((h3) => {
      if (!h3.id) h3.id = `${s.id}-${slugify(h3.textContent)}`;
      return h3;
    });
    return { s, h, subs };
  });
  const nav = document.createElement("nav");
  nav.className = "page-nav";
  nav.id = "page-nav";
  nav.setAttribute("aria-label", "On this page");
  nav.innerHTML = `<div class="bn-host"></div><p class="toc-title">On this page</p><ol>${groups.map((g, i) => `<li class="toc-group"${g.s.dataset.view ? ` data-view="${g.s.dataset.view}"` : ""}>
      <div class="toc-row"><a href="#${g.s.id}" data-i="${i}">${esc(g.h.textContent.trim())}</a>${g.subs.length ? `<button type="button" class="toc-more" aria-expanded="false" aria-controls="toc-sub-${i}"><span class="sr">Show sub-sections of ${esc(g.h.textContent.trim())}</span></button>` : ""}</div>
      ${g.subs.length ? `<ol class="toc-sub" id="toc-sub-${i}" hidden>${g.subs.map((h3) => `<li><a href="#${h3.id}">${esc(h3.textContent.trim())}</a></li>`).join("")}</ol>` : ""}</li>`).join("")}</ol>`;
  document.body.append(nav);
  document.body.classList.add("has-toc");

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "toc-toggle";
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", "page-nav");
  btn.textContent = "Contents";
  tools().append(btn);
  const close = (refocus) => { nav.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); if (refocus) btn.focus(); };
  btn.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
    if (open) { const f = nav.querySelector("a"); if (f) f.focus(); }
  });
  nav.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("is-open")) close(true); });
  nav.addEventListener("click", (e) => { if (e.target.closest("a") && nav.classList.contains("is-open")) close(false); });

  const setOpen = (li, open) => {
    const b = li.querySelector(".toc-more"), sub = li.querySelector(".toc-sub");
    if (!b || !sub) return;
    b.setAttribute("aria-expanded", String(open)); sub.hidden = !open;
  };
  nav.querySelectorAll(".toc-more").forEach((b) => b.addEventListener("click", () => {
    const li = b.closest(".toc-group"); li.dataset.manual = "1"; setOpen(li, b.getAttribute("aria-expanded") !== "true");
  }));
  const items = [...nav.querySelectorAll(".toc-group")];
  const subLinks = [...nav.querySelectorAll(".toc-sub a")];
  const mark = () => {
    const line = window.innerHeight * 0.4;
    let cur = 0;
    groups.forEach((g, i) => { if (g.s.offsetParent !== null && g.s.getBoundingClientRect().top < line) cur = i; });
    items.forEach((li, i) => {
      const a = li.querySelector(".toc-row a");
      i === cur ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current");
      if (!li.dataset.manual) setOpen(li, i === cur);
    });
    let subCur = null;
    groups[cur].subs.forEach((h3) => { if (h3.getBoundingClientRect().top < line) subCur = h3.id; });
    subLinks.forEach((a) => (a.getAttribute("href") === `#${subCur}` ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
  };
  window.addEventListener("scroll", mark, { passive: true });
  mark();
  return nav;
}

/* ---------------------------------------------------------------- text splitting */
/* Wraps each word of el (keeping <em> etc.) in .wm > .wi masks; the text stays readable to assistive tech. */
export function splitWords(el) {
  if (!el || el.dataset.splitDone) return [];
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.append(document.createTextNode(tok)); return; }
          const m = document.createElement("span"); m.className = "wm";
          const i = document.createElement("span"); i.className = "wi"; i.textContent = tok;
          m.append(i); frag.append(m);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains("wm")) walk(n);
    });
  };
  walk(el);
  el.dataset.splitDone = "1";
  return [...el.querySelectorAll(".wi")];
}

/* Splits a name into letters for the kinetic hero; screen readers get the plain name. */
export function splitChars(el, text) {
  el.innerHTML = `<span class="sr">${esc(text)}</span><span aria-hidden="true">${String(text).split(" ").map((w) =>
    `<span class="w">${[...w].map((c) => `<span class="ch"><span class="chi">${esc(c)}</span></span>`).join("")}</span>`).join(" ")}</span>`;
  return [...el.querySelectorAll(".chi")];
}

/* ---------------------------------------------------------------- motion */
let lenis = null;
export const scrollState = { progress: () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? window.scrollY / max : 0;
}, velocity: () => (lenis ? lenis.velocity : 0) };

function smoothScroll() {
  if (!MOTION || !window.Lenis) return;
  /* shift + wheel is left to the browser, so it scrolls a horizontal deck sideways instead of moving the page. */
  lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true, virtualScroll: ({ event }) => !event.shiftKey });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* In-page anchors scroll smoothly (Lenis) and move focus to the target for keyboard and screen-reader users. */
function anchors() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = url.hash === "#top" ? document.body : document.querySelector(decodeURIComponent(url.hash));
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(url.hash === "#top" ? 0 : target, { offset: -72, duration: 1.4 });
    else target.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth" });
    history.replaceState(null, "", url.hash === "#top" ? location.pathname : url.hash);
    const focusEl = url.hash === "#top" ? document.querySelector(".mark") : target;
    if (focusEl) { if (!focusEl.hasAttribute("tabindex") && !/^(A|BUTTON)$/.test(focusEl.tagName)) focusEl.setAttribute("tabindex", "-1"); focusEl.focus({ preventScroll: true }); }
  });
}

/* Page-to-page curtain: CSS slides it away on arrival (so a JS failure can never leave it covering the page);
   GSAP draws it back in before following a link to another page. */
function transitions() {
  const curtain = document.querySelector(".curtain");
  if (!curtain) return;
  window.addEventListener("pageshow", (e) => { if (e.persisted) gsap && gsap.set(curtain, { yPercent: -100 }); });
  if (!MOTION) return;
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank" || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/(\/|\.html)$/.test(url.pathname) || url.pathname.replace(/index\.html$/, "") === location.pathname.replace(/index\.html$/, "")) return;
    e.preventDefault();
    curtain.classList.add("is-leaving");
    gsap.fromTo(curtain, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: "expo.inOut", onComplete: () => { location.href = url.href; } });
  });
}

/* Reveal tweens are tracked so the failsafe can finish them: [{ el, tween }], plus the elements whose tween started. */
const pending = [];
const started = new WeakSet();
function revealAll() {
  pending.splice(0).forEach(({ tween }) => { if (tween.scrollTrigger) tween.scrollTrigger.kill(); tween.progress(1).kill(); });
  if (gsap) gsap.set("[data-rv], .wi", { clearProps: "transform,opacity" });
  document.querySelectorAll("[data-rv]").forEach((el) => el.classList.add("is-in"));
}
/* True if something on screen is still waiting for a scroll trigger that never fired. */
function stalled() {
  return pending.some(({ el }) => {
    if (started.has(el)) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
  });
}
const track = (el, tween) => { pending.push({ el, tween }); return tween; };

function reveals() {
  if (!MOTION) { revealAll(); return; }
  gsap.registerPlugin(ScrollTrigger);
  document.querySelectorAll("[data-split]").forEach((el) => {
    const words = splitWords(el);
    track(el, gsap.from(words, { yPercent: 115, rotate: 3, duration: 1.15, ease: "expo.out", stagger: 0.045,
      scrollTrigger: { trigger: el, start: "top 88%", once: true }, onStart: () => started.add(el) }));
  });
  document.querySelectorAll("[data-rv]").forEach((el) => {
    track(el, gsap.from(el, { y: 46, opacity: 0, duration: 1.1, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true }, onStart: () => started.add(el), onComplete: () => el.classList.add("is-in") }));
  });
  document.querySelectorAll("[data-scrub]").forEach((el) => {
    const words = splitWords(el);
    gsap.fromTo(words, { opacity: 0.55 }, { opacity: 1, ease: "none", stagger: 0.08,
      scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: 0.6 } });
  });
  document.querySelectorAll("[data-count]").forEach((el) => {
    const n = parseFloat(el.dataset.count);
    if (!Number.isFinite(n)) return;
    const obj = { v: 0 };
    gsap.to(obj, { v: n, duration: 1.6, ease: "power2.out", onUpdate: () => { el.textContent = Math.round(obj.v); },
      scrollTrigger: { trigger: el, start: "top 92%", once: true }, onComplete: () => { el.textContent = el.dataset.final || String(n); } });
  });
  document.querySelectorAll("[data-draw]").forEach((el) => {
    gsap.fromTo(el, { scaleY: 0 }, { scaleY: 1, ease: "none", transformOrigin: "top center",
      scrollTrigger: { trigger: el.parentElement, start: "top 70%", end: "bottom 60%", scrub: 0.4 } });
  });
  document.querySelectorAll("[data-parallax]").forEach((el) => {
    gsap.to(el, { yPercent: parseFloat(el.dataset.parallax) || -12, ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
  });
  setTimeout(() => ScrollTrigger.refresh(), 400);
}

/* Kinetic name: letters rise in, then lean away from the pointer on springs (GSAP quickTo). */
export function kineticName(el, text) {
  const chars = splitChars(el, text);
  if (!MOTION) return;
  // When the Big Bang intro plays, its particles settle exactly onto these letters, so they must already be in place.
  if (!root.classList.contains("intro-on")) {
    gsap.from(chars, { yPercent: 120, rotate: 10, opacity: 0, duration: 1.3, ease: "expo.out", stagger: 0.035, delay: 0.25 });
  }
  if (!DESKTOP) return;
  // Each letter leans away from the pointer but never leaves its own frame (its .ch cell): the push is clamped to a
  // small fraction of the cell, so neighbouring letters can never overlap.
  const movers = chars.map((c) => ({ el: c, x: gsap.quickTo(c, "x", { duration: 0.6, ease: "elastic.out(1, 0.5)" }),
    y: gsap.quickTo(c, "y", { duration: 0.6, ease: "elastic.out(1, 0.5)" }), r: gsap.quickTo(c, "rotation", { duration: 0.7, ease: "power3.out" }) }));
  const R = 190;
  window.addEventListener("pointermove", (e) => {
    if (root.classList.contains("intro-on")) return;              // letters hold still under the intro overlay
    for (const m of movers) {
      const b = m.el.parentElement.getBoundingClientRect();
      const dx = b.left + b.width / 2 - e.clientX, dy = b.top + b.height / 2 - e.clientY, d = Math.hypot(dx, dy) || 1;
      const f = d < R ? (1 - d / R) ** 2 : 0;
      m.x((dx / d) * f * b.width * 0.09); m.y((dy / d) * f * b.height * 0.06); m.r((dx / d) * f * 4);
    }
  }, { passive: true });
}

/* ---------------------------------------------------------------- boot */
export async function boot({ page, render, fieldMode = 0 }) {
  const failsafe = setTimeout(revealAll, 2500);
  window.addEventListener("beforeprint", revealAll);
  let data;
  try {
    const [d0, links, journey] = await Promise.all([loadData(), loadOptional("links.json"), loadOptional("journey.json")]);
    data = d0; extras.links = links || {}; extras.journey = journey || {};
  } catch (e) {
    console.error(e);
    $("main").insertAdjacentHTML("afterbegin", '<p class="err">Could not load content. Serve the site over HTTP (see README).</p>');
    revealAll(); return;
  }
  chrome(data, page);
  const out = (await render(data)) || {};
  const nav = pageNav();
  root.dataset.labReady = "1";
  if (PRERENDER) { clearTimeout(failsafe); return; }

  smoothScroll();
  window.__lab = { lenis, gsap, ScrollTrigger };
  document.dispatchEvent(new CustomEvent("lab:ready"));
  anchors();
  transitions();
  reveals();
  clearTimeout(failsafe);
  // Failsafe (2.5 s): if anything on screen is still hidden because its scroll trigger never fired, show everything.
  setTimeout(() => { if (stalled()) revealAll(); }, 2500);
  if (out.after) out.after({ lenis, gsap, ScrollTrigger });
  if (location.hash) { const t = document.querySelector(decodeURIComponent(location.hash)); if (t) setTimeout(() => (lenis ? lenis.scrollTo(t, { offset: -72, immediate: true }) : t.scrollIntoView()), 60); }

  // three.js only where it adds something and costs nothing important: desktop, motion allowed, page idle.
  if (MOTION && DESKTOP) {
    const go = async () => {
      try {
        const [{ mountField }, { mountSphere }] = await Promise.all([import("./field3d.js"), import("./sphere3d.js")]);
        const field = mountField({ mode: out.fieldMode ?? fieldMode, toggle: document.querySelector(".field-toggle"),
          getScroll: scrollState.progress, getVelocity: scrollState.velocity });
        if (field && out.kickers) document.querySelectorAll(out.kickers).forEach((el) => el.addEventListener("pointerenter", () => {
          const r = el.getBoundingClientRect(); field.kick(r.left + r.width / 2, r.top + r.height / 2);
        }));
        const host = nav && nav.querySelector(".bn-host");
        if (host && window.matchMedia("(min-width: 1380px)").matches) {
          const sphere = mountSphere(host, { getProgress: scrollState.progress, getVelocity: scrollState.velocity });
          if (sphere && lenis) lenis.on("scroll", sphere.update);
        }
      } catch (e) { console.warn("lab field unavailable", e); }
    };
    "requestIdleCallback" in window ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 300);
  }
}

/* Plain text or a list of paragraphs, as stored in content.json. */
export const paras = (v) => (Array.isArray(v) ? v : v ? [v] : []).map((t) => `<p>${esc(t)}</p>`).join("");
